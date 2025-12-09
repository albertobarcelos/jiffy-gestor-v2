'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { GrupoItem } from './GrupoItem'
import { useGruposProdutosInfinite } from '@/src/presentation/hooks/useGruposProdutos'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import { showToast } from '@/src/shared/utils/toast'
import { MdSearch } from 'react-icons/md'
import {
  GruposProdutosTabsModal,
  GruposProdutosTabsModalState,
} from './GruposProdutosTabsModal'

interface GruposProdutosListProps {
  onReload?: () => void
}

/**
 * Lista de grupos de produtos com scroll infinito e drag and drop
 * Usa React Query para cache automático e deduplicação de requisições
 */
export function GruposProdutosList({ onReload }: GruposProdutosListProps) {
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const [tabsModalState, setTabsModalState] = useState<GruposProdutosTabsModalState>({
    open: false,
    tab: 'grupo',
    mode: 'create',
    grupoId: undefined,
  })

  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requer movimento de 8px para ativar (evita drag acidental)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Debounce da busca (500ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText])

  // Determina o filtro ativo (memoizado)
  const ativoFilter = useMemo<boolean | null>(() => {
    return filterStatus === 'Ativo' ? true : filterStatus === 'Desativado' ? false : null
  }, [filterStatus])

  // Hook otimizado com React Query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
  } = useGruposProdutosInfinite({
    name: debouncedSearch || undefined,
    ativo: ativoFilter,
    limit: 10,
  })


  // Lista vinda do servidor (React Query)
  const serverGrupos = useMemo(() => {
    return data?.pages.flatMap((page) => page.grupos) || []
  }, [data])

  // Estado local para feedback imediato (optimistic UI)
  const [localGrupos, setLocalGrupos] = useState<GrupoProduto[]>([])

  // Sempre que a lista do servidor mudar, sincroniza o estado local
  useEffect(() => {
    setLocalGrupos(serverGrupos)
  }, [serverGrupos])

  const totalGrupos = useMemo(() => {
    return data?.pages[0]?.count || 0
  }, [data])

  // Handler de scroll com throttle para melhor performance
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
    
    // Carregar próxima página quando estiver a 10px do final
    if (distanceFromBottom <= 10) {
      if (hasNextPage && !isFetchingNextPage && !isFetching) {
        fetchNextPage()
      }
    }
  }, [hasNextPage, isFetchingNextPage, isFetching, fetchNextPage])

  // Scroll infinito usando Intersection Observer (mais confiável)
  useEffect(() => {
    const loadMoreElement = loadMoreRef.current
    if (!loadMoreElement || !hasNextPage || isFetchingNextPage || isFetching) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetching) {
          fetchNextPage()
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '10px', // Carrega quando está a 10px de ficar visível
        threshold: 0.1,
      }
    )

    observer.observe(loadMoreElement)

    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, isFetching, fetchNextPage, localGrupos.length])

  // Também manter o listener de scroll como fallback
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const onScroll = () => {
      handleScroll()
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    
    return () => {
      container.removeEventListener('scroll', onScroll)
    }
  }, [handleScroll])

  // Notificar erro
  useEffect(() => {
    if (error) {
      console.error('Erro ao carregar grupos de produtos:', error)
    }
  }, [error])

  const handleStatusChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['grupos-produtos'] })
    onReload?.()
  }, [queryClient, onReload])

  const handleTabsModalReload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['grupos-produtos'] })
    onReload?.()
  }, [onReload, queryClient])

  const handleToggleGrupoStatus = useCallback(
    async (grupoId: string, novoStatus: boolean) => {
      const token = auth?.getAccessToken()
      if (!token) return

      try {
        const response = await fetch(`/api/grupos-produtos/${grupoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ativo: novoStatus }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.message || 'Erro ao atualizar grupo')
        }

        handleStatusChange()
      } catch (error) {
        console.error('Erro ao atualizar status do grupo:', error)
        showToast.error('Não foi possível atualizar o status do grupo.')
      }
    },
    [auth, handleStatusChange]
  )

  const openTabsModal = useCallback(
    (config: Partial<GruposProdutosTabsModalState>) => {
      setTabsModalState((prev) => ({
        open: true,
        tab: config.tab ?? prev.tab,
        mode: config.mode ?? prev.mode,
        grupoId: config.grupoId,
      }))
    },
    []
  )

  const closeTabsModal = useCallback(() => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
    }))
  }, [])

  const handleTabsModalTabChange = useCallback((tab: 'grupo') => {
    setTabsModalState((prev) => ({
      ...prev,
      tab,
    }))
  }, [])

  // Handler para quando o drag termina - versão simples: envia para API e recarrega a página
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    // Calcula a nova posição baseada na lista atual
    const oldIndex = localGrupos.findIndex((g: GrupoProduto) => g.getId() === active.id)
    const newIndex = localGrupos.findIndex((g: GrupoProduto) => g.getId() === over.id)
    
    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Feedback visual imediato: reordena lista local
    const previousState = [...localGrupos]
    const updatedState = arrayMove([...localGrupos], oldIndex, newIndex)
    setLocalGrupos(updatedState)

    // Nova posição (1-based, como a API espera)
    const newOrder = newIndex + 1
    const grupoId = active.id as string

    // Envia requisição para o backend
    try {
      const token = auth?.getAccessToken()
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(
        `/api/grupos-produtos/${grupoId}/reordena-grupo`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ novaPosicao: newOrder }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao reordenar grupo')
      }

      showToast.success('Ordem atualizada com sucesso!')
      // Recarrega a página por completo para buscar a nova ordem direto do backend
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (error: any) {
      console.error('Erro ao reordenar grupo:', error)
      // Reverte feedback otimista
      setLocalGrupos(previousState)
      showToast.error(error.message || 'Erro ao atualizar ordem do grupo')
    }
  }, [localGrupos, auth])

  return (
    <>
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pt-1 pb-[6px]">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="pl-5">
              <p className="text-primary text-sm font-semibold font-nunito mb-1">
                Grupos Cadastrados
              </p>
              <p className="text-tertiary text-[22px] font-medium font-nunito">
                Total {localGrupos.length} de {totalGrupos}
              </p>
            </div>
            <div className="flex-1 flex gap-2 items-center justify-end flex-wrap md:flex-nowrap">
              
              <button
                onClick={() =>
                  openTabsModal({
                    tab: 'grupo',
                    mode: 'create',
                    grupoId: undefined,
                  })
                }
                className="h-8 px-[30px] bg-primary text-info rounded-lg font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
              >
                Novo
                <span className="text-lg">+</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="h-[2px] border-t-2 border-primary/70"></div>

      <div className="flex gap-3 px-[20px] py-2">
        <div className="flex-1 min-w-[180px] max-w-[360px]">
            <label
              htmlFor="grupos-complementos-search"
              className="text-xs font-semibold text-secondary-text mb-1 block"
            >
              Buscar grupo...
            </label>
            <div className="relative h-8">
              <input
                id="grupos-complementos-search"
                type="text"
                placeholder="Pesquisar grupo..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-full px-5 pl-12 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
                <MdSearch size={18} />
              </span>
            </div>
          </div>

          <div className="w-full sm:w-[160px]">
            <label className="text-xs font-semibold text-secondary-text mb-1 block">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Desativado')
              }
              className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
            >
              <option value="Todos">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Desativado">Desativado</option>
            </select>
          </div>
      </div>

      {/* Cabeçalho da tabela */}
      <div className="px-[30px] mt-1">
        <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px]">
          <div className="flex-[1] font-nunito font-semibold text-sm text-primary-text">
            Ordem
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Ícones do Grupo
          </div>
          <div className="flex-[4] font-nunito font-semibold text-sm text-primary-text">
            Nome
          </div>
          <div className="flex-[2] text-center font-nunito font-semibold text-sm text-primary-text">
            Status
          </div>
          <div className="flex-[2] text-right font-nunito font-semibold text-sm text-primary-text">
            Ações
          </div>
        </div>
      </div>

      {/* Lista de grupos com scroll e drag and drop */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] mt-2 scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {/* Skeleton loaders para carregamento inicial - sempre mostra durante loading */}
        {(isLoading || (localGrupos.length === 0 && isFetching)) && (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-[50px] bg-info rounded-lg px-4 flex items-center gap-[10px] animate-pulse"
              >
                <Skeleton className="flex-[1] h-4" />
                <Skeleton className="flex-[2] h-10 w-10" />
                <Skeleton className="flex-[4] h-4" />
                <Skeleton className="flex-[2] h-6 w-20 mx-auto" />
                <Skeleton className="flex-[2] h-10 w-10 ml-auto" />
              </div>
            ))}
          </div>
        )}

        {localGrupos.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum grupo encontrado.</p>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localGrupos.map((g) => g.getId())}
            strategy={verticalListSortingStrategy}
          >
            {localGrupos.map((grupo: GrupoProduto, index: number) => (
              <GrupoItem
                key={grupo.getId()}
                grupo={grupo}
                index={index}
                onStatusChanged={handleStatusChange}
                onToggleStatus={handleToggleGrupoStatus}
                onEdit={(g) =>
                  openTabsModal({
                    tab: 'grupo',
                    mode: 'edit',
                    grupoId: g.getId(),
                  })
                }
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Elemento sentinela para Intersection Observer - posicionado após todos os grupos */}
        {hasNextPage && !isFetchingNextPage && (
          <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
            {/* Espaço para trigger do observer */}
          </div>
        )}
        
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
    <GruposProdutosTabsModal
      state={tabsModalState}
      onClose={closeTabsModal}
      onReload={handleTabsModalReload}
      onTabChange={handleTabsModalTabChange}
    />
    </>
  )
}
