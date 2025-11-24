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
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()

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

  // Achatando todas as páginas em uma única lista (memoizado)
  const grupos = useMemo(() => {
    return data?.pages.flatMap((page) => page.grupos) || []
  }, [data])

  const totalGrupos = useMemo(() => {
    return data?.pages[0]?.count || 0
  }, [data])

  // Handler de scroll com throttle para melhor performance
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      return // Ignora se já há um timeout pendente
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const container = scrollContainerRef.current
      if (!container) return

      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
      
      // Carregar próxima página quando estiver a 400px do final (prefetch mais agressivo)
      if (distanceFromBottom < 400) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }

      scrollTimeoutRef.current = null
    }, 100) // Throttle de 100ms
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Scroll infinito com prefetching inteligente e throttle
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [handleScroll])

  // Notificar erro
  useEffect(() => {
    if (error) {
      console.error('Erro ao carregar grupos de produtos:', error)
    }
  }, [error])

  const handleStatusChange = useCallback(() => {
    // Invalidar cache para forçar refetch
    queryClient.invalidateQueries({ queryKey: ['grupos-produtos'] })
    onReload?.()
  }, [queryClient, onReload])

  // Handler para quando o drag termina
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    // Obtém o estado atual dos grupos do cache
    const currentData = queryClient.getQueryData(['grupos-produtos', 'infinite', { name: debouncedSearch || undefined, ativo: ativoFilter, limit: 10 }]) as any
    const currentGrupos = currentData?.pages?.[0]?.grupos || grupos

    const oldIndex = currentGrupos.findIndex((g: GrupoProduto) => g.getId() === active.id)
    const newIndex = currentGrupos.findIndex((g: GrupoProduto) => g.getId() === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Atualiza a ordem localmente (otimistic update)
    const newGrupos = arrayMove([...currentGrupos], oldIndex, newIndex)
    
    // Atualiza o cache do React Query otimisticamente
    queryClient.setQueryData(['grupos-produtos', 'infinite', { name: debouncedSearch || undefined, ativo: ativoFilter, limit: 10 }], (old: any) => {
      if (!old) return old
      return {
        ...old,
        pages: old.pages.map((page: any, pageIndex: number) => {
          if (pageIndex === 0) {
            return {
              ...page,
              grupos: newGrupos,
            }
          }
          return page
        }),
      }
    })

    // Calcula a nova posição (1-based)
    const newOrder = newIndex + 1
    const grupoId = active.id as string

    // Atualiza no backend
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
        // Reverte a mudança local se falhar
        queryClient.invalidateQueries({ queryKey: ['grupos-produtos'] })
        const error = await response.json()
        throw new Error(error.message || 'Erro ao reordenar grupo')
      }

      // Sucesso - invalidar cache para garantir sincronização
      queryClient.invalidateQueries({ queryKey: ['grupos-produtos'] })
      showToast.success('Ordem atualizada com sucesso!')
    } catch (error: any) {
      console.error('Erro ao reordenar grupo:', error)
      // Reverte a mudança local
      queryClient.invalidateQueries({ queryKey: ['grupos-produtos'] })
      showToast.error(error.message || 'Erro ao atualizar ordem do grupo')
    }
  }, [grupos, auth, queryClient, debouncedSearch, ativoFilter])

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pt-[30px] pb-[10px]">
        <div className="flex items-start justify-between">
          <div className="w-1/2 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito mb-2">
              Grupos Cadastrados
            </p>
            <p className="text-tertiary text-[26px] font-medium font-nunito">
              Total {grupos.length} de {totalGrupos}
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = '/cadastros/grupos-produtos/novo'
            }}
            className="h-10 px-[30px] bg-primary text-info rounded-[30px] font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Novo
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>

      {/* Divisor amarelo */}
      <div className="relative">
        <div className="h-[63px] border-t-2 border-alternate"></div>
        <div className="absolute top-3 left-[30px] right-[30px] flex gap-[10px]">
          {/* Barra de pesquisa */}
          <div className="flex-[3]">
            <div className="h-[50px] relative">
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-full px-5 pl-12 rounded-[24px] border-[0.6px] border-secondary bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-secondary font-nunito text-sm"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
                🔍
              </span>
            </div>
          </div>

          {/* Filtro de status */}
          <div className="flex-1">
            <div className="h-[48px]">
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(
                    e.target.value as 'Todos' | 'Ativo' | 'Desativado'
                  )
                }
                className="w-[175px] h-full px-5 rounded-[24px] border-[0.6px] border-secondary bg-info text-primary-text focus:outline-none focus:border-secondary font-nunito text-sm"
              >
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Desativado">Desativado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Cabeçalho da tabela */}
      <div className="px-[30px] mt-0">
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
        className="flex-1 overflow-y-auto px-[30px] mt-2"
      >
        {/* Skeleton loaders para carregamento inicial - sempre mostra durante loading */}
        {(isLoading || (grupos.length === 0 && isFetching)) && (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-[50px] bg-info rounded-xl px-4 flex items-center gap-[10px] animate-pulse"
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

        {grupos.length === 0 && !isLoading && (
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
            items={grupos.map((g) => g.getId())}
            strategy={verticalListSortingStrategy}
          >
            {grupos.map((grupo, index) => (
              <GrupoItem
                key={grupo.getId()}
                grupo={grupo}
                index={index}
                onStatusChanged={handleStatusChange}
              />
            ))}
          </SortableContext>
        </DndContext>

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
