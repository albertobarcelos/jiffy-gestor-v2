'use client'

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { GrupoComplementoActionsMenu } from './GrupoComplementoActionsMenu'
import { useGruposComplementosInfinite } from '@/src/presentation/hooks/useGruposComplementos'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import {
  MdSearch,
  MdOutlineOfflinePin,
  MdModeEdit,
  MdExtension,
  MdAddCircle,
  MdKeyboardArrowUp,
  MdKeyboardArrowDown,
} from 'react-icons/md'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import {
  GruposComplementosTabsModal,
  GruposComplementosTabsModalState,
} from './GruposComplementosTabsModal'

interface GruposComplementosListProps {
  onReload?: () => void
}

/**
 * Item individual da lista de grupos (memoizado para evitar re-renders desnecessários)
 */
const GrupoItem = memo(function GrupoItem({
  grupo,
  onToggleStatus,
  onActionsChanged,
  onOpenComplementosModal,
  onEditGrupo,
  onChangeQuantidade,
  isChangingQuantidade,
  ordemPosicional,
}: {
  grupo: GrupoComplemento
  onToggleStatus?: (grupoId: string, novoStatus: boolean) => void
  onActionsChanged?: () => void
  onOpenComplementosModal?: (grupo: GrupoComplemento) => void
  onEditGrupo?: (grupo: GrupoComplemento) => void
  onChangeQuantidade?: (grupo: GrupoComplemento, tipo: 'min' | 'max', delta: number) => void
  isChangingQuantidade?: boolean
  ordemPosicional: number
}) {
  const complementos = useMemo(() => grupo.getComplementos() || [], [grupo])
  const ordem = useMemo(() => {
    const value = grupo.getOrdem?.()
    if (typeof value === 'undefined') {
      console.warn('[GruposComplementosList] Grupo sem ordem recebida do backend', {
        id: grupo.getId(),
        nome: grupo.getNome(),
        grupo,
      })
    }
    return value
  }, [grupo])
  const complementosIds = useMemo(() => grupo.getComplementosIds() || [], [grupo])
  const isAtivo = useMemo(() => grupo.isAtivo(), [grupo])
  const hasComplementos = useMemo(() => complementosIds.length > 0, [complementosIds])

  return (
    <div className="bg-info rounded-xl mb-2">
      {/* Linha principal do grupo */}
      <div className="px-4 flex items-center gap-[10px]">
        <div className="w-16 flex flex-col items-center text-center text-xs text-secondary-text">
          
          <span className="text-lg font-semibold text-primary-text/70">
            {ordemPosicional}
          </span>
        </div>
        <div className="flex-[3] min-w-0 flex items-start gap-3 pl-3">
          <MdAddCircle className="text-primary size-9 shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="truncate font-nunito font-semibold text-lg text-primary-text">
              {grupo.getNome()}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="Editar grupo"
                aria-label={`Editar ${grupo.getNome()}`}
                onClick={() => onEditGrupo?.(grupo)}
                className="w-6 h-6 rounded-full border border-primary/30 text-primary flex items-center justify-center hover:bg-primary/10 transition-colors"
              >
                <MdModeEdit className="text-base" />
              </button>
              <button
                type="button"
                title="Editar complementos do grupo"
                aria-label={`Editar complementos do grupo ${grupo.getNome()}`}
                onClick={() => onOpenComplementosModal?.(grupo)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  hasComplementos
                    ? 'bg-primary text-white border border-primary hover:bg-primary/90'
                    : 'bg-info text-primary border border-primary/30 hover:bg-gray-300'
                }`}
              >
                <MdExtension className="text-base" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex-[3] flex justify-center">
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: 'Qtd mín.',
                valor: grupo.getQtdMinima(),
                tipo: 'min' as const,
                invertButtons: true,
              },
              {
                label: 'Qtd máx.',
                valor: grupo.getQtdMaxima(),
                tipo: 'max' as const,
                invertButtons: false,
              },
            ].map((item) => (
              <div
                key={`${grupo.getId()}-${item.tipo}`}
                className={`flex items-center gap-2 ${item.invertButtons ? 'flex-row-reverse justify-end' : ''}`}
              >
                <div className="flex flex-col items-center text-center text-xs text-secondary-text min-w-[70px]">
                  <span className="uppercase tracking-wide">{item.label}</span>
                  <span className="text-sm font-semibold text-primary-text">{item.valor}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    aria-label={`Aumentar ${item.label}`}
                    disabled={isChangingQuantidade}
                    onClick={() => onChangeQuantidade?.(grupo, item.tipo, 1)}
                    className="w-4 h-4 rounded-md border border-gray-300 flex items-center justify-center text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    <MdKeyboardArrowUp />
                  </button>
                  <button
                    type="button"
                    aria-label={`Diminuir ${item.label}`}
                    disabled={isChangingQuantidade}
                    onClick={() => onChangeQuantidade?.(grupo, item.tipo, -1)}
                    className="w-4 h-4 rounded-md border border-gray-300 flex items-center justify-center text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    <MdKeyboardArrowDown />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex-[2] flex items-center justify-start">
          {complementos.length === 0 ? (
            <span className="text-sm font-nunito text-secondary-text">Nenhum complemento</span>
          ) : (
            <select
              className="w-full px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-primary-text focus:outline-none focus:border-primary"
              defaultValue=""
              onChange={(event) => {
                event.target.value = ''
              }}
            >
              <option value="" disabled>{complementos.length} complemento(s)</option>
              {complementos.map((complemento: any, index: number) => (
                <option key={complemento.id || index} value={complemento.nome || `complemento-${index}`}>
                  {complemento.nome || 'Complemento sem nome'}{' '}
                  {typeof complemento.valor !== 'undefined'
                    ? `--- R$ ${Number(complemento.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex-[2] flex items-center justify-center">
          <label className="relative inline-flex items-center h-6 w-12 cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isAtivo}
              onChange={(event) => onToggleStatus?.(grupo.getId(), event.target.checked)}
            />
            <div className="w-full h-full rounded-full bg-gray-300 peer-checked:bg-accent1 transition-colors" />
            <span className="absolute left-1 top-1/2 block h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-5" />
          </label>
        </div>
        <div className="flex-1 flex justify-end items-center">
          <GrupoComplementoActionsMenu
            grupoId={grupo.getId()}
            grupoAtivo={isAtivo}
            onStatusChanged={onActionsChanged}
            onEditRequested={() => onEditGrupo?.(grupo)}
          />
        </div>
      </div>

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
    refetch,
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

  const { auth } = useAuthStore()
  const [updatingQuantidadeId, setUpdatingQuantidadeId] = useState<string | null>(null)

  const [tabsModalState, setTabsModalState] = useState<GruposComplementosTabsModalState>({
    open: false,
    tab: 'grupo',
    mode: 'create',
    grupo: undefined,
  })

  const handleActionsReload = useCallback(async () => {
    await refetch()
    onReload?.()
  }, [refetch, onReload])

  const toggleGroupStatus = useCallback(
    async (grupoId: string, novoStatus: boolean) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      try {
        const response = await fetch(`/api/grupos-complementos/${grupoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ativo: novoStatus }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar status do grupo')
        }

        showToast.success(
          novoStatus
            ? 'Grupo de complementos ativado com sucesso!'
            : 'Grupo de complementos desativado com sucesso!'
        )
        await handleActionsReload()
      } catch (error: any) {
        console.error('Erro ao atualizar status do grupo:', error)
        showToast.error(error.message || 'Erro ao atualizar status do grupo')
      }
    },
    [auth, handleActionsReload]
  )

  const openTabsModal = useCallback(
    (config: Partial<GruposComplementosTabsModalState>) => {
      setTabsModalState(() => ({
        open: true,
        tab: config.tab ?? 'grupo',
        mode: config.mode ?? 'create',
        grupo: config.grupo,
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

  const handleTabsModalReload = useCallback(async () => {
    await handleActionsReload()
  }, [handleActionsReload])

  const handleTabsModalTabChange = useCallback((tab: 'grupo' | 'complementos') => {
    setTabsModalState((prev) => ({
      ...prev,
      tab,
    }))
  }, [])

  const handleOpenComplementosModal = useCallback(
    (grupo: GrupoComplemento) => {
      openTabsModal({
        tab: 'complementos',
        mode: 'edit',
        grupo,
      })
    },
    [openTabsModal]
  )

  const handleEditGrupo = useCallback(
    (grupo: GrupoComplemento) => {
      const grupoId = grupo.getId()
      if (tabsModalState.open && tabsModalState.grupo?.getId() === grupoId) {
        handleTabsModalTabChange('grupo')
        return
      }
      openTabsModal({
        tab: 'grupo',
        mode: 'edit',
        grupo,
      })
    },
    [handleTabsModalTabChange, openTabsModal, tabsModalState.grupo, tabsModalState.open]
  )

  const handleChangeQuantidade = useCallback(
    async (grupo: GrupoComplemento, tipo: 'min' | 'max', delta: number) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      let novoMin = grupo.getQtdMinima()
      let novoMax = grupo.getQtdMaxima()

      if (tipo === 'min') {
        novoMin = Math.max(0, novoMin + delta)
        if (novoMin > novoMax) {
          novoMax = novoMin
        }
      } else {
        novoMax = Math.max(0, novoMax + delta)
        if (novoMax < novoMin) {
          novoMin = novoMax
        }
      }

      if (novoMin === grupo.getQtdMinima() && novoMax === grupo.getQtdMaxima()) {
        return
      }

      setUpdatingQuantidadeId(grupo.getId())

      try {
        const response = await fetch(`/api/grupos-complementos/${grupo.getId()}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ qtdMinima: novoMin, qtdMaxima: novoMax }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar quantidades do grupo')
        }

        showToast.success('Quantidades atualizadas com sucesso!')
        await handleActionsReload()
      } catch (error: any) {
        console.error('Erro ao atualizar quantidades do grupo:', error)
        showToast.error(error.message || 'Erro ao atualizar quantidades do grupo')
      } finally {
        setUpdatingQuantidadeId(null)
      }
    },
    [auth, handleActionsReload]
  )

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
            onClick={() =>
              openTabsModal({
                tab: 'grupo',
                mode: 'create',
                grupo: undefined,
              })
            }
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
          <div className="w-16 font-nunito font-semibold text-sm text-primary-text text-center">
            Ordem
          </div>
          <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
            Nome
          </div>
          <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text text-center">
            Qtd Mín/Máx
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Complementos
          </div>
          <div className="flex-[2] text-center font-nunito font-semibold text-sm text-primary-text">
            Status
          </div>
          <div className="flex-1 text-right font-nunito font-semibold text-sm text-primary-text">
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
                <Skeleton className="w-10 h-4" />
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

        {grupos.map((grupo, index) => (
            <GrupoItem
              key={grupo.getId()}
              grupo={grupo}
              onToggleStatus={toggleGroupStatus}
              onActionsChanged={handleActionsReload}
              onOpenComplementosModal={handleOpenComplementosModal}
              onEditGrupo={handleEditGrupo}
              onChangeQuantidade={handleChangeQuantidade}
              isChangingQuantidade={updatingQuantidadeId === grupo.getId()}
            ordemPosicional={index + 1}
            />
          ))}

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <GruposComplementosTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onReload={handleTabsModalReload}
        onTabChange={handleTabsModalTabChange}
      />
    </div>
  )
}
