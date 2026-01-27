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
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  GruposProdutosTabsModal,
  GruposProdutosTabsModalState,
} from './GruposProdutosTabsModal'
import { ProdutosTabsModal, ProdutosTabsModalState } from '../produtos/ProdutosTabsModal'

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
  const router = useRouter() // Obter a instância do router
  const searchParams = useSearchParams() // Obter os search params da URL
  const pathname = usePathname() // Obter o pathname da URL
  const [tabsModalState, setTabsModalState] = useState<GruposProdutosTabsModalState>({
    open: false,
    tab: 'grupo',
    mode: 'create',
    grupoId: undefined,
  })
  const [produtoTabsState, setProdutoTabsState] = useState<ProdutosTabsModalState>({
    open: false,
    tab: 'produto',
    mode: 'create',
    produto: undefined,
    prefillGrupoProdutoId: undefined,
    grupoId: undefined,
  })
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

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

  const showInitialLoading =
    !hasLoadedOnce || ((isLoading || isFetching) && localGrupos.length === 0)

  useEffect(() => {
    if (!isLoading && !isFetching && !isFetchingNextPage) {
      setHasLoadedOnce(true)
    }
  }, [isLoading, isFetching, isFetchingNextPage])

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
        initialTab: config.initialTab ?? prev.initialTab,
      }))

      // Adicionar um parâmetro na URL para forçar o recarregamento ao fechar o modal de grupo
      const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
      currentSearchParams.set('modalGrupoOpen', 'true')
      router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    },
    [router, searchParams, pathname]
  )

  const closeTabsModal = useCallback(() => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
    }))
    
    // Remover o parâmetro da URL para forçar o recarregamento da rota
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.delete('modalGrupoOpen')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    router.refresh() // Força a revalidação da rota principal
    queryClient.invalidateQueries({ queryKey: ['grupos-produtos'], exact: false }) // Invalida todas as queries de grupos de produtos
    queryClient.invalidateQueries({ queryKey: ['produtos', 'infinite'] }) // Invalida o cache do React Query para produtos
  }, [router, searchParams, pathname, queryClient])

  const handleTabsModalTabChange = useCallback((tab: 'grupo') => {
    setTabsModalState((prev) => ({
      ...prev,
      tab,
    }))
  }, [])

  const handleOpenProdutoModal = useCallback(
    (grupoId: string) => {
      setProdutoTabsState({
        open: true,
        tab: 'produto',
        mode: 'create',
        produto: undefined,
        prefillGrupoProdutoId: grupoId,
        grupoId: undefined,
      })

      // Adicionar um parâmetro na URL para forçar o recarregamento ao fechar
      const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
      currentSearchParams.set('modalProdutoOpen', 'true')
      router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    },
    [router, searchParams, pathname]
  )

  const handleCloseProdutoModal = useCallback(() => {
    setProdutoTabsState((prev) => ({
      ...prev,
      open: false,
      produto: undefined,
      prefillGrupoProdutoId: undefined,
      grupoId: undefined,
    }))
    
    // Remover o parâmetro da URL para forçar o recarregamento da rota
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.delete('modalProdutoOpen')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    router.refresh() // Força a revalidação da rota principal
    queryClient.invalidateQueries({ queryKey: ['grupos-produtos'], exact: false }) // Invalida todas as queries de grupos de produtos
    queryClient.invalidateQueries({ queryKey: ['produtos', 'infinite'] }) // Invalida o cache do React Query para produtos
  }, [router, searchParams, queryClient, pathname])

  const handleProdutoTabChange = useCallback(
    (tab: 'produto' | 'complementos' | 'impressoras' | 'grupo') => {
      setProdutoTabsState((prev) => ({
        ...prev,
        tab,
      }))
    },
    []
  )

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
      <div className="md:px-[30px] px-1 pt-1 pb-[6px]">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="md:pl-5">
              <p className="text-primary text-sm md:text-lg font-semibold font-nunito mb-1">
                Grupos Cadastrados
              </p>
              <p className="text-tertiary md:text-[22px] text-sm font-medium font-nunito">
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

      <div className="flex gap-3 md:px-[20px] px-1 py-2">
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
      <div className="md:px-[30px] px-1 mt-1">
        <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px]">
          <div className="flex-[1] font-nunito font-semibold md:text-sm text-[10px] text-primary-text">
            Ordem
          </div>
          <div className="flex-[2] font-nunito font-semibold md:text-sm text-[10px] text-primary-text">
            Ícones do Grupo
          </div>
          <div className="flex-[4] font-nunito font-semibold md:text-sm text-[10px] text-primary-text">
            Nome
          </div>
          <div className="flex-[2] md:text-center text-right font-nunito font-semibold md:text-sm text-[10px] text-primary-text">
            Status
          </div>
        </div>
      </div>

      {/* Lista de grupos com scroll e drag and drop */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto md:px-[30px] px-1 mt-2 scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {/* Skeleton loaders para carregamento inicial - sempre mostra durante loading */}
        {showInitialLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <img
                src="/images/jiffy-loading.gif"
                alt="Carregando"
                className="w-16 h-16 object-contain"
              />
              <span className="text-sm font-medium text-primary-text font-nunito">Carregando...</span>
            </div>
          </div>
        )}

        {localGrupos.length === 0 && !isLoading && !isFetching && hasLoadedOnce && (
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
                onCreateProduto={(grupoId) => handleOpenProdutoModal(grupoId)}
                onEdit={(g) =>
                  openTabsModal({
                    tab: 'grupo',
                    mode: 'edit',
                    grupoId: g.getId(),
                  })
                }
                onEditProdutos={(g) =>
                  openTabsModal({
                    tab: 'grupo',
                    mode: 'edit',
                    grupoId: g.getId(),
                    initialTab: 1, // Abre na aba "Produtos Vinculados"
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
    <ProdutosTabsModal
      state={produtoTabsState}
      onClose={handleCloseProdutoModal}
      onReload={onReload}
      onTabChange={handleProdutoTabChange}
    />
    </>
  )
}
