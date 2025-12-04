'use client'

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { GrupoComplementoActionsMenu } from './GrupoComplementoActionsMenu'
import { useGruposComplementosInfinite } from '@/src/presentation/hooks/useGruposComplementos'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import { MdSearch } from 'react-icons/md'

interface GruposComplementosListProps {
  onReload?: () => void
}

/**
 * Item individual da lista de grupos (memoizado para evitar re-renders desnecessários)
 */
const GrupoItem = memo(function GrupoItem({
  grupo,
  isExpanded,
  onToggleExpand,
  onStatusChanged,
}: {
  grupo: GrupoComplemento
  isExpanded: boolean
  onToggleExpand: () => void
  onStatusChanged?: () => void
}) {
  const complementos = useMemo(() => grupo.getComplementos() || [], [grupo])
  const complementosIds = useMemo(() => grupo.getComplementosIds() || [], [grupo])
  const isAtivo = useMemo(() => grupo.isAtivo(), [grupo])
  const statusClass = useMemo(
    () =>
      isAtivo
        ? 'bg-success/20 text-success'
        : 'bg-error/20 text-secondary-text',
    [isAtivo]
  )

  return (
    <div className="bg-info rounded-xl mb-2 overflow-hidden">
      {/* Linha principal do grupo */}
      <div className="h-[50px] px-4 flex items-center gap-[10px]">
        <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
          {grupo.getNome()}
        </div>
        <div className="flex-[2] font-nunito text-sm text-secondary-text">
          {grupo.getQtdMinima()} / {grupo.getQtdMaxima()}
        </div>
        <div className="flex-[2] font-nunito text-sm text-secondary-text">
          {complementosIds.length} complemento(s)
        </div>
        <div className="flex-[2] flex justify-center">
          <div
            className={`w-20 px-3 py-1 rounded-[24px] text-center text-sm font-nunito font-medium ${statusClass}`}
          >
            {isAtivo ? 'Ativo' : 'Desativado'}
          </div>
        </div>
        <div className="flex-[2] flex justify-end items-center gap-2">
          {complementos.length > 0 && (
            <button
              onClick={onToggleExpand}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary-bg/20 transition-colors"
            >
              <span className={`text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
          )}
          <GrupoComplementoActionsMenu
            grupoId={grupo.getId()}
            grupoAtivo={isAtivo}
            onStatusChanged={onStatusChanged}
          />
        </div>
      </div>

      {/* Lista de complementos expandida */}
      {isExpanded && complementos.length > 0 && (
        <div className="px-4 pb-4 border-t border-alternate/30">
          <div className="pt-3 space-y-2">
            {complementos.map((complemento: any, index: number) => (
              <div
                key={complemento.id || index}
                className="px-3 py-2 bg-primary-bg rounded-lg"
              >
                <p className="text-sm font-medium text-primary-text">
                  {complemento.nome || 'Complemento sem nome'}
                </p>
                {complemento.valor && (
                  <p className="text-xs text-secondary-text">
                    R$ {parseFloat(complemento.valor).toFixed(2)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

/**
 * Lista de grupos de complementos com scroll infinito
 * Usa React Query para cache automático e deduplicação de requisições
 */
export function GruposComplementosList({ onReload }: GruposComplementosListProps) {
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
  } = useGruposComplementosInfinite({
    q: debouncedSearch || undefined,
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

  const filteredTotal = useMemo(() => {
    return grupos.length
  }, [grupos])

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

  // Carrega automaticamente todas as páginas (10 itens por vez)
  useEffect(() => {
    if (!hasNextPage) {
      return
    }

    if (!isFetching && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetching, isFetchingNextPage, fetchNextPage])

  // Notificar erro
  useEffect(() => {
    if (error) {
      console.error('Erro ao carregar grupos de complementos:', error)
    }
  }, [error])

  const handleStatusChange = useCallback(() => {
    onReload?.()
  }, [onReload])

  const toggleExpand = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header com título, filtros e botão */}
      <div className="px-[30px] pt-[10px] pb-[10px]">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito mb-1">
              Grupos de Complementos Cadastrados
            </p>
            <p className="text-tertiary text-[26px] font-medium font-nunito">
              Total {grupos.length} de {filteredTotal}
            </p>
          </div>

          <div className="flex-[2] min-w-[280px]">
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
                className="w-full h-full px-5 pl-12 rounded-[24px] border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
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
              className="w-full h-8 px-5 rounded-[24px] border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
            >
              <option value="Todos">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Desativado">Desativado</option>
            </select>
          </div>

          <button
            onClick={() => {
              window.location.href = '/cadastros/grupos-complementos/novo'
            }}
            className="h-10 px-[30px] bg-primary text-info rounded-[30px] font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Novo
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>
      <div className="h-[10px] border-t-2 border-alternate"></div>

      {/* Cabeçalho da tabela */}
      <div className="px-[30px]">
        <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px]">
          <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
            Nome
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Qtd Mín/Máx
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Complementos
          </div>
          <div className="flex-[2] text-center font-nunito font-semibold text-sm text-primary-text">
            Status
          </div>
          <div className="flex-[2] text-right font-nunito font-semibold text-sm text-primary-text">
            Ações
          </div>
        </div>
      </div>

      {/* Lista de grupos com scroll */}
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
                <Skeleton className="flex-[3] h-4" />
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[2] h-6 w-20 mx-auto" />
                <Skeleton className="flex-[2] h-10 w-10 ml-auto" />
              </div>
            ))}
          </div>
        )}

        {grupos.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum grupo de complementos encontrado.</p>
          </div>
        )}

        {grupos.map((grupo) => (
          <GrupoItem
            key={grupo.getId()}
            grupo={grupo}
            isExpanded={expandedGroups.has(grupo.getId())}
            onToggleExpand={() => toggleExpand(grupo.getId())}
            onStatusChanged={handleStatusChange}
          />
        ))}

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
