'use client'

'use client'

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { useGruposComplementosInfinite } from '@/src/presentation/hooks/useGruposComplementos'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import {
  MdSearch,
  MdExtension,
  MdAddCircle,
  MdKeyboardArrowUp,
  MdKeyboardArrowDown,
} from 'react-icons/md'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useQueryClient } from '@tanstack/react-query'
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
  rowIndex,
}: {
  grupo: GrupoComplemento
  onToggleStatus?: (grupoId: string, novoStatus: boolean) => void
  onActionsChanged?: () => void
  onOpenComplementosModal?: (grupo: GrupoComplemento) => void
  onEditGrupo?: (grupo: GrupoComplemento) => void
  onChangeQuantidade?: (grupo: GrupoComplemento, tipo: 'min' | 'max', delta: number) => void
  isChangingQuantidade?: boolean
  ordemPosicional: number
  rowIndex: number
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

  // Handler para abrir edição ao clicar na linha
  const handleRowClick = useCallback(() => {
    onEditGrupo?.(grupo)
  }, [grupo, onEditGrupo])

  return (
    <div className="bg-info rounded-lg mb-2">
      
      {/* Linha principal do grupo */}
      <div 
        onClick={handleRowClick}
        className={`md:px-4 py-2 flex items-center rounded-lg gap-[10px] transition-shadow hover:bg-secondary-bg/15 cursor-pointer ${
          rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'
        }`}
      >
        <div className="w-16 flex-col items-start text-xs text-secondary-text hidden md:flex">
          
          <span className="text-sm text-left font-semibold text-primary-text/70">
            {ordemPosicional}
          </span>
        </div>
        <div className="md:flex-[3] flex-[2] min-w-0 flex items-start gap-3 pl-1 md:pl-3">
          <div className="flex flex-col md:flex-row gap-1">
            <span className="flex items-center gap-2 truncate font-nunito font-semibold md:text-sm text-xs text-primary-text">
              {grupo.getNome()}
            </span>
              <button
                type="button"
                title="Editar complementos do grupo"
                aria-label={`Editar complementos do grupo ${grupo.getNome()}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenComplementosModal?.(grupo)
                }}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                  hasComplementos
                    ? 'bg-primary text-white border border-primary hover:bg-primary/90'
                    : 'bg-info text-primary border border-primary/30 hover:bg-gray-300'
                }`}
              >
                <MdExtension className="text-sm" />
              </button>
          </div>
        </div>
        <div className="flex-[3] justify-center hidden md:flex" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-2 text-sm gap-4">
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
        
        <div className="flex-[2] flex items-center justify-start" onClick={(e) => e.stopPropagation()}>
          {complementos.length === 0 ? (
            <span className="text-sm font-nunito text-secondary-text">Nenhum complemento</span>
          ) : (
            <select
              className="w-full md:px-3 py-1.5 rounded-xl border border-gray-300 bg-white md:text-sm text-xs font-semibold text-primary-text focus:outline-none focus:border-primary"
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
        <div className="md:flex-[2] flex items-center md:justify-center justify-end" onClick={(e) => e.stopPropagation()}>
          <label 
            className="relative inline-flex items-center h-4 w-8 md:h-5 md:w-12 cursor-pointer"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isAtivo}
              onChange={(event) => {
                event.stopPropagation()
                onToggleStatus?.(grupo.getId(), event.target.checked)
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="w-full h-full rounded-full bg-gray-300 peer-checked:bg-primary transition-colors" />
            <span className="absolute left-[2px] top-1/2 block h-[12px] w-[12px] md:h-3 md:w-3 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-[14px] md:peer-checked:translate-x-6" />
          </label>
        </div>
      </div>

    </div>
  )
})

export function GruposComplementosList({ onReload }: GruposComplementosListProps) {
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
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

  useEffect(() => {
    if (!isLoading && !isFetching) {
      setHasLoadedOnce(true)
    }
  }, [isLoading, isFetching])

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const queryClient = useQueryClient() // Declarar queryClient aqui

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

      // Adicionar um parâmetro na URL para forçar o recarregamento ao fechar o modal de complemento
      const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
      currentSearchParams.set('modalComplementoOpen', 'true')
      router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    },
    [router, searchParams, pathname]
  )

  const closeTabsModal = useCallback(async () => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
    }))
    
    // Remover o parâmetro da URL para forçar o recarregamento da rota
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.delete('modalComplementoOpen')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    router.refresh() // Força a revalidação da rota principal
    // Invalida o cache do React Query para grupos de complementos
    await queryClient.invalidateQueries({ queryKey: ['grupos-complementos'], exact: false })
  }, [router, searchParams, pathname, refetch])

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
      <div className="md:px-[30px] px-2 py-[4px] flex-shrink-0">
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col md:pl-5">
            <p className="text-primary text-sm font-semibold font-nunito">
              Grupos de Complementos Cadastrados
            </p>
            <p className="text-tertiary md:text-[22px] text-sm font-medium font-nunito">
              Total {grupos.length} de {filteredTotal}
            </p>
          </div>
          <button
            onClick={() =>
              openTabsModal({
                tab: 'grupo',
                mode: 'create',
                grupo: undefined,
              })
            }
            className="h-8 md:px-[30px] px-4 bg-primary text-info rounded-lg font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Novo
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>
      <div className="h-[2px] border-t-2 border-primary/70 flex-shrink-0"></div>
      <div className="flex gap-3 md:px-[20px] px-2 py-2 flex-shrink-0">
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
      <div className="md:px-[30px] px-1 flex-shrink-0">
        <div className="h-10 bg-custom-2 rounded-lg md:px-4 px-1 flex items-center gap-[10px]">
          <div className="w-16 font-nunito font-semibold text-sm text-primary-text justify-start hidden md:flex">
            Ordem
          </div>
          <div className="md:flex-[3] flex-[2] font-nunito font-semibold md:text-sm text-xs text-primary-text">
            Nome
          </div>
          <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text justify-center hidden md:flex">
            Qtd de Complementos
          </div>
          <div className="flex-[2] font-nunito font-semibold md:text-sm text-xs text-primary-text">
            Complementos
          </div>
          <div className="md:flex-[2] md:text-center text-right font-nunito font-semibold md:text-sm text-xs text-primary-text">
            Status
          </div>
        </div>
      </div>

      {/* Lista de grupos com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto md:px-[30px] px-2 mt-2 scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {/* Skeleton loaders para carregamento inicial - sempre mostra durante loading */}
        {(isLoading || (grupos.length === 0 && isFetching)) && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <img
              src="/images/jiffy-loading.gif"
              alt="Carregando"
              className="w-16 h-16 object-contain"
            />
            <p className="text-sm text-secondary-text text-center">Carregando grupos...</p>
          </div>
        )}

        {grupos.length === 0 && !isLoading && !isFetching && hasLoadedOnce && (
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
            rowIndex={index}
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
