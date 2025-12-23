'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import { MeioPagamentoActionsMenu } from './MeioPagamentoActionsMenu'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdSearch, MdModeEdit } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import {
  MeiosPagamentosTabsModal,
  MeiosPagamentosTabsModalState,
} from './MeiosPagamentosTabsModal'

interface MeiosPagamentosListProps {
  onReload?: () => void
}

/**
 * Mapeamento entre valores da API e labels para exibição
 */
const formasPagamentoFiscalMap: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão Crédito',
  cartao_debito: 'Cartão Débito',
}

/**
 * Função para formatar a forma de pagamento fiscal para exibição
 */
function formatarFormaPagamentoFiscal(forma: string): string {
  const formaLower = forma.toLowerCase()
  return formasPagamentoFiscalMap[formaLower] || forma
}

/**
 * Lista de meios de pagamento com scroll infinito
 * Replica exatamente o design e lógica do Flutter
 */
export function MeiosPagamentosList({ onReload }: MeiosPagamentosListProps) {
  const [meiosPagamento, setMeiosPagamento] = useState<MeioPagamento[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [totalMeiosPagamento, setTotalMeiosPagamento] = useState(0)
  const [updatingTefAtivo, setUpdatingTefAtivo] = useState<Record<string, boolean>>({})
  const [updatingAtivo, setUpdatingAtivo] = useState<Record<string, boolean>>({})
  const [tabsModalState, setTabsModalState] = useState<MeiosPagamentosTabsModalState>({
    open: false,
    tab: 'meio-pagamento',
    mode: 'create',
    meioPagamentoId: undefined,
  })
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hasLoadedInitialRef = useRef(false)
  const { auth, isAuthenticated } = useAuthStore()

  // Refs para evitar dependências desnecessárias no useCallback
  const isLoadingRef = useRef(false)
  const searchTextRef = useRef('')
  const filterStatusRef = useRef<'Todos' | 'Ativo' | 'Desativado'>('Ativo')

  // Atualiza refs quando os valores mudam
  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

  useEffect(() => {
    searchTextRef.current = searchText
  }, [searchText])

  useEffect(() => {
    filterStatusRef.current = filterStatus
  }, [filterStatus])

  const loadMeiosPagamento = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token || isLoadingRef.current) {
      return
    }

    setIsLoading(true)
    isLoadingRef.current = true

    // Determina o filtro ativo
    let ativoFilter: boolean | null = null
    if (filterStatusRef.current === 'Ativo') {
      ativoFilter = true
    } else if (filterStatusRef.current === 'Desativado') {
      ativoFilter = false
    }

    try {
      const limit = 10
      let currentOffset = 0
      let hasMore = true
      const acumulado: MeioPagamento[] = []
      let totalFromApi: number | null = null

      while (hasMore) {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
        })

        if (searchTextRef.current) {
          params.append('q', searchTextRef.current)
        }

        if (ativoFilter !== null) {
          params.append('ativo', ativoFilter.toString())
        }

        const response = await fetch(`/api/meios-pagamentos?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || `Erro ${response.status}: ${response.statusText}`
          throw new Error(errorMessage)
        }

        const data = await response.json()

        const newMeiosPagamento = (data.items || []).map((item: any) =>
          MeioPagamento.fromJSON(item)
        )

        if (typeof data.count === 'number') {
          totalFromApi = data.count
        }

        acumulado.push(...newMeiosPagamento)
        setMeiosPagamento([...acumulado])

        if (totalFromApi !== null) {
          setTotalMeiosPagamento(totalFromApi)
        }

        currentOffset += newMeiosPagamento.length
        hasMore =
          newMeiosPagamento.length === limit &&
          (totalFromApi ? currentOffset < totalFromApi : true)

        if (newMeiosPagamento.length === 0) {
          hasMore = false
        }
      }

      setMeiosPagamento(acumulado)
      setTotalMeiosPagamento(totalFromApi ?? acumulado.length)
      if (totalFromApi !== null && totalFromApi !== acumulado.length) {
        setTotalMeiosPagamento(acumulado.length)
      }
    } catch (error) {
      console.error('Erro ao carregar meios de pagamento:', error)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [auth])

  // Debounce da busca
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      loadMeiosPagamento()
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText, auth, loadMeiosPagamento])

  // Recarrega ao trocar filtro de status
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return

    loadMeiosPagamento()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus])

  // Carrega meios de pagamento iniciais apenas quando o token estiver disponível
  useEffect(() => {
    if (!isAuthenticated || hasLoadedInitialRef.current) return

    const token = auth?.getAccessToken()
    if (!token) return

    hasLoadedInitialRef.current = true
    loadMeiosPagamento()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleStatusChange = () => {
    loadMeiosPagamento()
    onReload?.()
  }

  const openTabsModal = useCallback((config: Partial<MeiosPagamentosTabsModalState> = {}) => {
    setTabsModalState(() => ({
      open: true,
      tab: config.tab ?? 'meio-pagamento',
      mode: config.mode ?? 'create',
      meioPagamentoId: config.meioPagamentoId,
    }))
  }, [])

  const closeTabsModal = useCallback(() => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
      meioPagamentoId: undefined,
    }))
  }, [])

  const handleTabsModalReload = useCallback(() => {
    loadMeiosPagamento()
    onReload?.()
  }, [loadMeiosPagamento, onReload])

  const handleTabsModalTabChange = useCallback((tab: 'meio-pagamento') => {
    setTabsModalState((prev) => ({
      ...prev,
      tab,
    }))
  }, [])

  const handleToggleTefAtivo = useCallback(
    async (meioPagamento: MeioPagamento, novoStatus: boolean) => {
      const token = auth?.getAccessToken()
      if (!token) {
        return
      }

      const meioPagamentoId = meioPagamento.getId()
      const previousTefAtivo = meioPagamento.isTefAtivo()

      setUpdatingTefAtivo((prev) => ({ ...prev, [meioPagamentoId]: true }))
      setMeiosPagamento((prev) =>
        prev.map((item) => {
          if (item.getId() === meioPagamentoId) {
            return MeioPagamento.create(
              item.getId(),
              item.getNome(),
              novoStatus,
              item.getFormaPagamentoFiscal(),
              item.isAtivo()
            )
          }
          return item
        })
      )

      try {
        const response = await fetch(`/api/meios-pagamentos/${meioPagamentoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tefAtivo: novoStatus }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || errorData.error || 'Erro ao atualizar TEF')
        }

        await loadMeiosPagamento()
        onReload?.()
      } catch (error) {
        console.error('Erro ao atualizar TEF:', error)
        showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar TEF')
        // Reverter para o estado anterior em caso de erro
        setMeiosPagamento((prev) =>
          prev.map((item) => {
            if (item.getId() === meioPagamentoId) {
              return MeioPagamento.create(
                item.getId(),
                item.getNome(),
                previousTefAtivo,
                item.getFormaPagamentoFiscal(),
                item.isAtivo()
              )
            }
            return item
          })
        )
      } finally {
        setUpdatingTefAtivo((prev) => {
          const { [meioPagamentoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, loadMeiosPagamento, onReload]
  )

  const handleToggleAtivo = useCallback(
    async (meioPagamento: MeioPagamento, novoStatus: boolean) => {
      const token = auth?.getAccessToken()
      if (!token) {
        return
      }

      const meioPagamentoId = meioPagamento.getId()
      const previousAtivo = meioPagamento.isAtivo()

      setUpdatingAtivo((prev) => ({ ...prev, [meioPagamentoId]: true }))
      setMeiosPagamento((prev) =>
        prev.map((item) => {
          if (item.getId() === meioPagamentoId) {
            return MeioPagamento.create(
              item.getId(),
              item.getNome(),
              item.isTefAtivo(),
              item.getFormaPagamentoFiscal(),
              novoStatus
            )
          }
          return item
        })
      )

      try {
        const response = await fetch(`/api/meios-pagamentos/${meioPagamentoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ativo: novoStatus }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || errorData.error || 'Erro ao atualizar status')
        }

        await loadMeiosPagamento()
        onReload?.()
      } catch (error) {
        console.error('Erro ao atualizar status:', error)
        showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar status')
        // Reverter para o estado anterior em caso de erro
        setMeiosPagamento((prev) =>
          prev.map((item) => {
            if (item.getId() === meioPagamentoId) {
              return MeioPagamento.create(
                item.getId(),
                item.getNome(),
                item.isTefAtivo(),
                item.getFormaPagamentoFiscal(),
                previousAtivo
              )
            }
            return item
          })
        )
      } finally {
        setUpdatingAtivo((prev) => {
          const { [meioPagamentoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, loadMeiosPagamento, onReload]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pt-2 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="w-1/2 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito">
              Meios de Pagamento Cadastrados
            </p>
            <p className="text-tertiary text-[22px] font-medium font-nunito">
              Total {meiosPagamento.length} de {totalMeiosPagamento}
            </p>
          </div>
          <button
            onClick={() => openTabsModal({ mode: 'create' })}
            className="h-8 px-[30px] bg-primary text-info rounded-lg font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Novo
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>

      <div className="h-[4px] border-t-2 border-primary/70 flex-shrink-0"></div>
      <div className="bg-white px-[20px] py-2 border-b border-gray-100 flex-shrink-0">
        <div className="flex flex-wrap items-end gap-2">
          {/* Barra de pesquisa */}
          <div className="flex-1 min-w-[180px] max-w-[360px]">
            <label htmlFor="meios-pagamentos-search" className="text-xs font-semibold text-secondary-text mb-1 block">
              Buscar meio de pagamento...
            </label>
            <div className="relative h-8">
              <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text" size={18} />
              <input
                id="meios-pagamentos-search"
                type="text"
                placeholder="Pesquisar..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-full pl-11 pr-4 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
              />
            </div>
          </div>

          {/* Filtro de status */}
          <div className="w-full sm:w-[160px]">
            <label className="text-xs font-semibold text-secondary-text mb-1 block">Status</label>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value as 'Todos' | 'Ativo' | 'Desativado'
                )
              }
              className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
            >
              <option value="Todos">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Desativado">Desativado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cabeçalho da tabela */}
      <div className="px-[30px] mt-0 flex-shrink-0">
        <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px]">
          <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
            Nome
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Forma Fiscal
          </div>
          <div className="flex-[2] text-center font-nunito font-semibold text-sm text-primary-text">
            TEF Ativo
          </div>
          <div className="flex-[2] text-center font-nunito font-semibold text-sm text-primary-text">
            Status
          </div>
          <div className="flex-[2] text-right font-nunito font-semibold text-sm text-primary-text">
            Ações
          </div>
        </div>
      </div>

      {/* Lista de meios de pagamento com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] mt-2 scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {meiosPagamento.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum meio de pagamento encontrado.</p>
          </div>
        )}

        {meiosPagamento.map((meioPagamento) => (
          <div
            key={meioPagamento.getId()}
            className="bg-info rounded-lg mb-2 shadow-lg hover:bg-secondary-bg/15 transition-colors"
          >
            <div className="h-[50px] px-4 flex items-center gap-[10px]">
              <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text flex items-center gap-2">
                # <span>{meioPagamento.getNome()}</span>
                <button
                  type="button"
                  title="Editar meio de pagamento"
                  onClick={() =>
                    openTabsModal({
                      mode: 'edit',
                      meioPagamentoId: meioPagamento.getId(),
                    })
                  }
                  className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-primary-text hover:bg-primary/10 transition-colors"
                >
                  <MdModeEdit size={14} />
                </button>
              </div>
              <div className="flex-[2] font-nunito text-sm text-secondary-text">
                {formatarFormaPagamentoFiscal(meioPagamento.getFormaPagamentoFiscal())}
              </div>
              <div className="flex-[2] flex justify-center">
                <label
                  className={`relative inline-flex h-5 w-12 items-center ${
                    updatingTefAtivo[meioPagamento.getId()]
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer'
                  }`}
                  title={meioPagamento.isTefAtivo() ? 'TEF Ativo' : 'TEF Inativo'}
                >
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={meioPagamento.isTefAtivo()}
                    onChange={(event) =>
                      handleToggleTefAtivo(meioPagamento, event.target.checked)
                    }
                    disabled={!!updatingTefAtivo[meioPagamento.getId()]}
                  />
                  <div className="h-full w-full rounded-full bg-gray-300 transition-colors peer-checked:bg-primary" />
                  <span className="absolute left-1 top-1/2 block h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-6" />
                </label>
              </div>
              <div className="flex-[2] flex justify-center">
                <label
                  className={`relative inline-flex h-5 w-12 items-center ${
                    updatingAtivo[meioPagamento.getId()]
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer'
                  }`}
                  title={meioPagamento.isAtivo() ? 'Ativo' : 'Desativado'}
                >
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={meioPagamento.isAtivo()}
                    onChange={(event) =>
                      handleToggleAtivo(meioPagamento, event.target.checked)
                    }
                    disabled={!!updatingAtivo[meioPagamento.getId()]}
                  />
                  <div className="h-full w-full rounded-full bg-gray-300 transition-colors peer-checked:bg-primary" />
                  <span className="absolute left-1 top-1/2 block h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-6" />
                </label>
              </div>
              <div className="flex-[2] flex justify-end">
                <MeioPagamentoActionsMenu
                  meioPagamentoId={meioPagamento.getId()}
                  meioPagamentoAtivo={meioPagamento.isAtivo()}
                  onStatusChanged={handleStatusChange}
                  onEditRequested={(id) =>
                    openTabsModal({
                      mode: 'edit',
                      meioPagamentoId: id,
                    })
                  }
                />
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <MeiosPagamentosTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onTabChange={handleTabsModalTabChange}
        onReload={handleTabsModalReload}
      />
    </div>
  )
}


