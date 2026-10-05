'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MeioPagamento, type TipoParcelamento } from '@/src/domain/entities/MeioPagamento'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { MdSearch, MdDelete } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import {
  MeiosPagamentosTabsModal,
  MeiosPagamentosTabsModalState,
} from './MeiosPagamentosTabsModal'
import { isFormaFiscalCartaoCredito, TIPOS_PARCELAMENTO_OPCOES } from './meioPagamentoModalConstants'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/src/presentation/components/ui/dialog'

interface MeiosPagamentosListProps {
  onReload?: () => void
  /** No hub Delivery: lista preenche a altura do painel (sem maxHeight da rota full). */
  layoutDeliveryHub?: boolean
}

/** Largura do painel (não da janela) abaixo da qual tipografia/toggles ficam compactos. */
const LISTA_COMPACTA_MAX_WIDTH = 1200

/**
 * Mapeamento entre valores da API e labels para exibição
 */
const formasPagamentoFiscalMap: Record<string, string> = {
  dinheiro: 'DINHEIRO',
  pix: 'PIX',
  cartao_credito: 'CARTÃO DE CRÉDITO',
  cartao_debito: 'CARTÃO DE DÉBITO',
  vale_alimentacao: 'VALE ALIMENTAÇÃO',
  vale_refeicao: 'VALE REFEIÇÃO',
  vale_presente: 'VALE PRESENTE',
  vale_combustivel: 'VALE COMBUSTÍVEL',
}

/**
 * Função para formatar a forma de pagamento fiscal para exibição
 */
function formatarFormaPagamentoFiscal(forma: string): string {
  const formaLower = forma.toLowerCase()
  return formasPagamentoFiscalMap[formaLower] || forma
}

function clonarMeioPagamento(
  item: MeioPagamento,
  patch: {
    tefAtivo?: boolean
    isDelivery?: boolean
    ativo?: boolean
    parcelavel?: boolean
    tipoParcelamento?: TipoParcelamento | null
  }
): MeioPagamento {
  return MeioPagamento.create(
    item.getId(),
    item.getNome(),
    patch.tefAtivo ?? item.isTefAtivo(),
    item.getFormaPagamentoFiscal(),
    patch.ativo ?? item.isAtivo(),
    patch.parcelavel ?? item.isParcelavel(),
    patch.tipoParcelamento !== undefined ? patch.tipoParcelamento : item.getTipoParcelamento(),
    patch.isDelivery ?? item.isDelivery()
  )
}

/**
 * Lista de meios de pagamento com scroll infinito
 * Replica exatamente o design e lógica do Flutter
 */
export function MeiosPagamentosList({ onReload, layoutDeliveryHub = false }: MeiosPagamentosListProps) {
  const [meiosPagamento, setMeiosPagamento] = useState<MeioPagamento[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Todos')
  const [totalMeiosPagamento, setTotalMeiosPagamento] = useState(0)
  const [updatingTefAtivo, setUpdatingTefAtivo] = useState<Record<string, boolean>>({})
  const [updatingIsDelivery, setUpdatingIsDelivery] = useState<Record<string, boolean>>({})
  const [updatingParcelavel, setUpdatingParcelavel] = useState<Record<string, boolean>>({})
  const [updatingTipoParcelamento, setUpdatingTipoParcelamento] = useState<Record<string, boolean>>({})
  const [updatingAtivo, setUpdatingAtivo] = useState<Record<string, boolean>>({})
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [meioPagamentoToDelete, setMeioPagamentoToDelete] = useState<string | null>(null)
  const [tabsModalState, setTabsModalState] = useState<MeiosPagamentosTabsModalState>({
    open: false,
    tab: 'meio-pagamento',
    mode: 'create',
    meioPagamentoId: undefined,
  })
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const listRootRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hasLoadedInitialRef = useRef(false)
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  /**
   * Compacto pela largura do painel (hub tem menu lateral): a janela pode ser larga
   * e mesmo assim a lista ficar estreita — por isso não usamos breakpoint de viewport.
   */
  const [isCompact, setIsCompact] = useState(layoutDeliveryHub)
  const switchSize = isCompact ? 'xs' : 'sm'
  const deleteIconSize = isCompact ? 16 : 20
  const textTitle = isCompact ? 'text-xs' : 'text-xl'
  const textSubtitle = isCompact ? 'text-[11px]' : 'text-[22px]'
  const textCell = isCompact ? 'text-[10px]' : 'text-sm'
  const textMeta = isCompact ? 'text-[10px]' : 'text-xs'

  useEffect(() => {
    const el = listRootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const update = (width: number) => {
      setIsCompact(width < LISTA_COMPACTA_MAX_WIDTH)
    }

    update(el.getBoundingClientRect().width)

    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      update(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Refs para evitar dependências desnecessárias no useCallback
  const isLoadingRef = useRef(false)
  const searchTextRef = useRef('')
  const filterStatusRef = useRef<'Todos' | 'Ativo' | 'Desativado'>('Todos')

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
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
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

        const response = await fetchGestorApi(`/api/meios-pagamentos?${params.toString()}`, {
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

        const newMeiosPagamento = (data.items || []).map((item: unknown) =>
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
  }, [])

  // Debounce da busca
  useEffect(() => {
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
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
  }, [searchText, loadMeiosPagamento])

  // Recarrega ao trocar filtro de status
  useEffect(() => {
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) return

    loadMeiosPagamento()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus])

  // Carrega meios de pagamento iniciais apenas quando o token estiver disponível
  useEffect(() => {
    if (!isAuthenticated || hasLoadedInitialRef.current) return

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
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

    // Adicionar um parâmetro na URL para forçar o recarregamento ao fechar o modal
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.set('modalMeioPagamentoOpen', 'true')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
  }, [router, searchParams, pathname])

  const closeTabsModal = useCallback(() => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
      meioPagamentoId: undefined,
    }))

    // Remover o parâmetro da URL para forçar o recarregamento da rota
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.delete('modalMeioPagamentoOpen')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    router.refresh() // Força a revalidação da rota principal
    loadMeiosPagamento() // Recarrega a lista de meios de pagamento
    onReload?.()
  }, [router, searchParams, pathname, loadMeiosPagamento, onReload])

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

  const handleDeleteClick = useCallback((meioPagamentoId: string) => {
    setMeioPagamentoToDelete(meioPagamentoId)
    setIsConfirmDeleteOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!meioPagamentoToDelete) return

    setIsDeleting(true)

    try {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetchGestorApi(`/api/meios-pagamentos/${meioPagamentoToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Erro ao deletar meio de pagamento')
      }

      setIsConfirmDeleteOpen(false)
      setMeioPagamentoToDelete(null)
      showToast.success('Meio de pagamento deletado com sucesso!')
      await loadMeiosPagamento()
      onReload?.()
    } catch (error) {
      console.error('Erro ao deletar meio de pagamento:', error)
      showToast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao deletar meio de pagamento'
      )
    } finally {
      setIsDeleting(false)
    }
  }, [meioPagamentoToDelete, loadMeiosPagamento, onReload])


  const handleToggleTefAtivo = useCallback(
    async (meioPagamento: MeioPagamento, novoStatus: boolean) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        return
      }

      const meioPagamentoId = meioPagamento.getId()
      const previousTefAtivo = meioPagamento.isTefAtivo()

      setUpdatingTefAtivo((prev) => ({ ...prev, [meioPagamentoId]: true }))
      setMeiosPagamento((prev) =>
        prev.map((item) => {
          if (item.getId() === meioPagamentoId) {
            return clonarMeioPagamento(item, { tefAtivo: novoStatus })
          }
          return item
        })
      )

      try {
        const response = await fetchGestorApi(`/api/meios-pagamentos/${meioPagamentoId}`, {
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
              return clonarMeioPagamento(item, { tefAtivo: previousTefAtivo })
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
    [ loadMeiosPagamento, onReload]
  )

  const handleToggleIsDelivery = useCallback(
    async (meioPagamento: MeioPagamento, novoStatus: boolean) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        return
      }

      const meioPagamentoId = meioPagamento.getId()
      const previousIsDelivery = meioPagamento.isDelivery()

      setUpdatingIsDelivery((prev) => ({ ...prev, [meioPagamentoId]: true }))
      setMeiosPagamento((prev) =>
        prev.map((item) => {
          if (item.getId() === meioPagamentoId) {
            return clonarMeioPagamento(item, { isDelivery: novoStatus })
          }
          return item
        })
      )

      try {
        const response = await fetchGestorApi(`/api/meios-pagamentos/${meioPagamentoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ativoDelivery: novoStatus }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || errorData.error || 'Erro ao atualizar Delivery')
        }

        await loadMeiosPagamento()
        onReload?.()
      } catch (error) {
        console.error('Erro ao atualizar Delivery:', error)
        showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar Delivery')
        setMeiosPagamento((prev) =>
          prev.map((item) => {
            if (item.getId() === meioPagamentoId) {
              return clonarMeioPagamento(item, { isDelivery: previousIsDelivery })
            }
            return item
          })
        )
      } finally {
        setUpdatingIsDelivery((prev) => {
          const { [meioPagamentoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [loadMeiosPagamento, onReload]
  )

  const handleToggleParcelavel = useCallback(
    async (meioPagamento: MeioPagamento, novoStatus: boolean) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        return
      }

      const meioPagamentoId = meioPagamento.getId()
      const previousParcelavel = meioPagamento.isParcelavel()
      const previousTipo = meioPagamento.getTipoParcelamento()

      setUpdatingParcelavel((prev) => ({ ...prev, [meioPagamentoId]: true }))
      setMeiosPagamento((prev) =>
        prev.map((item) => {
          if (item.getId() === meioPagamentoId) {
            return clonarMeioPagamento(item, {
              parcelavel: novoStatus,
              tipoParcelamento: novoStatus
                ? (item.getTipoParcelamento() ?? 'jurosCliente')
                : item.getTipoParcelamento(),
            })
          }
          return item
        })
      )

      try {
        const response = await fetchGestorApi(`/api/meios-pagamentos/${meioPagamentoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isParcelavel: novoStatus }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || errorData.error || 'Erro ao atualizar parcelável')
        }

        const atualizado = MeioPagamento.fromJSON(await response.json())

        setMeiosPagamento((prev) =>
          prev.map((item) => (item.getId() === meioPagamentoId ? atualizado : item))
        )
        onReload?.()
      } catch (error) {
        console.error('Erro ao atualizar parcelável:', error)
        showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar parcelável')
        setMeiosPagamento((prev) =>
          prev.map((item) => {
            if (item.getId() === meioPagamentoId) {
              return clonarMeioPagamento(item, {
                parcelavel: previousParcelavel,
                tipoParcelamento: previousTipo,
              })
            }
            return item
          })
        )
      } finally {
        setUpdatingParcelavel((prev) => {
          const { [meioPagamentoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [ onReload]
  )

  const handleChangeTipoParcelamento = useCallback(
    async (meioPagamento: MeioPagamento, novoTipo: TipoParcelamento) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        return
      }

      const meioPagamentoId = meioPagamento.getId()
      const tipoAnterior = meioPagamento.getTipoParcelamento()

      setUpdatingTipoParcelamento((prev) => ({ ...prev, [meioPagamentoId]: true }))
      setMeiosPagamento((prev) =>
        prev.map((item) =>
          item.getId() === meioPagamentoId
            ? clonarMeioPagamento(item, { tipoParcelamento: novoTipo })
            : item
        )
      )

      try {
        const response = await fetchGestorApi(`/api/meios-pagamentos/${meioPagamentoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tipoParcelamento: novoTipo }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.message || errorData.error || 'Erro ao atualizar tipo de parcelamento'
          )
        }

        const atualizado = MeioPagamento.fromJSON(await response.json())

        setMeiosPagamento((prev) =>
          prev.map((item) => (item.getId() === meioPagamentoId ? atualizado : item))
        )
        onReload?.()
      } catch (error) {
        console.error('Erro ao atualizar tipo de parcelamento:', error)
        showToast.error(
          error instanceof Error ? error.message : 'Erro ao atualizar tipo de parcelamento'
        )
        setMeiosPagamento((prev) =>
          prev.map((item) =>
            item.getId() === meioPagamentoId
              ? clonarMeioPagamento(item, { tipoParcelamento: tipoAnterior })
              : item
          )
        )
      } finally {
        setUpdatingTipoParcelamento((prev) => {
          const { [meioPagamentoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [ onReload]
  )

  const handleToggleAtivo = useCallback(
    async (meioPagamento: MeioPagamento, novoStatus: boolean) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        return
      }

      const meioPagamentoId = meioPagamento.getId()
      const previousAtivo = meioPagamento.isAtivo()

      setUpdatingAtivo((prev) => ({ ...prev, [meioPagamentoId]: true }))
      setMeiosPagamento((prev) =>
        prev.map((item) => {
          if (item.getId() === meioPagamentoId) {
            return clonarMeioPagamento(item, { ativo: novoStatus })
          }
          return item
        })
      )

      try {
        const response = await fetchGestorApi(`/api/meios-pagamentos/${meioPagamentoId}`, {
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
              return clonarMeioPagamento(item, { ativo: previousAtivo })
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
    [ loadMeiosPagamento, onReload]
  )

  return (
    <div ref={listRootRef} className="flex h-full w-full min-w-0 flex-col">
      {/* Header com título e botão — espaçamento alinhado a ImpressorasList */}
      <div className="flex-shrink-0 px-1 pb-1 pt-1 md:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className={`font-semibold text-primary ${textTitle}`}>
              Meios de Pagamento Cadastrados
            </p>
            <p className={`font-medium text-tertiary ${textSubtitle}`}>
              Total {meiosPagamento.length} de {totalMeiosPagamento}
            </p>
          </div>
          <button
            onClick={() => openTabsModal({ mode: 'create' })}
            className={`flex shrink-0 items-center rounded-lg bg-primary font-semibold text-info transition-colors hover:bg-primary/90 md:px-[30px] ${
              isCompact ? 'h-7 gap-1.5 px-2 text-xs' : 'h-8 gap-2 px-2 text-sm'
            }`}
          >
            Novo
            <span className={isCompact ? 'text-base' : 'text-lg'}>+</span>
          </button>
        </div>
      </div>

      <div className="flex flex-shrink-0 gap-3 px-1 py-1 md:px-[20px]">
        <div className="min-w-0 flex-1 border-t-2 border-primary/70">
          <div className={`mt-2 flex flex-wrap items-start ${isCompact ? 'gap-2' : 'gap-3'}`}>
            <div
              className={`relative max-w-[360px] flex-1 ${
                isCompact ? 'h-7 min-w-[140px]' : 'h-8 min-w-[180px]'
              }`}
            >
              <MdSearch
                className={`absolute top-1/2 -translate-y-1/2 text-secondary-text ${
                  isCompact ? 'left-3' : 'left-4'
                }`}
                size={isCompact ? 16 : 18}
              />
              <input
                id="meios-pagamentos-search"
                type="text"
                placeholder="Pesquisar..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className={`h-full w-full rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none ${
                  isCompact ? 'pl-9 pr-3 text-xs' : 'pl-11 pr-4 text-sm'
                }`}
              />
            </div>
            <div className="flex w-full items-center gap-2 sm:w-[160px]">
              <label className={`block font-semibold text-secondary-text ${textMeta}`}>
                Status
              </label>
              <select
                value={filterStatus}
                onChange={e =>
                  setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Desativado')
                }
                className={`w-full rounded-lg border border-gray-200 bg-info text-primary-text focus:border-primary focus:outline-none ${
                  isCompact ? 'h-7 px-3 text-xs' : 'h-8 px-5 text-sm'
                }`}
              >
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Desativado">Desativado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Cabeçalho — tipografia compacta pela largura do painel */}
      <div className="mt-0 flex-shrink-0 px-1 md:px-[20px]">
        <div
          className={`flex items-center rounded-lg bg-custom-2 ${
            isCompact
              ? 'h-8 gap-1 px-0.5'
              : 'h-10 gap-[10px] px-1 md:px-4'
          }`}
        >
          <div className={`flex-[3] font-semibold leading-tight text-primary-text ${textCell}`}>
            Nome
          </div>
          <div
            className={`hidden flex-[2] font-semibold leading-tight text-primary-text md:flex ${textCell}`}
          >
            Forma Fiscal
          </div>
          <div
            className={`flex-[1] text-center font-semibold leading-tight text-primary-text md:flex-[2] ${textCell}`}
          >
            Terminal
          </div>
          <div
            className={`flex-[1] text-center font-semibold leading-tight text-primary-text md:flex-[2] ${textCell}`}
          >
            Delivery
          </div>
          <div
            className={`flex-[1] text-center font-semibold leading-tight text-primary-text md:flex-[2] ${textCell}`}
            title="Permite Parcela"
          >
            {isCompact ? 'Parcela' : 'Permite Parcela'}
          </div>
          <div
            className={`hidden flex-[2] text-center font-semibold leading-tight text-primary-text md:flex ${textCell}`}
            title="Tipo parcelamento"
          >
            {isCompact ? 'Tipo parc.' : 'Tipo parcelamento'}
          </div>
          <div
            className={`flex-[1] text-center font-semibold leading-tight text-primary-text md:flex-[2] ${textCell}`}
          >
            TEF
          </div>
          <div
            className={`flex-[1] text-right font-semibold leading-tight text-primary-text md:flex-[2] ${textCell}`}
          >
            Ações
          </div>
        </div>
      </div>

      {/* Lista de meios de pagamento com scroll */}
      <div
        ref={scrollContainerRef}
        className={
          layoutDeliveryHub
            ? 'mt-1 min-h-0 flex-1 overflow-y-auto px-1 scrollbar-hide md:px-[20px]'
            : 'mt-1 flex-1 overflow-y-auto px-1 scrollbar-hide md:px-[20px]'
        }
        style={layoutDeliveryHub ? undefined : { maxHeight: 'calc(100vh - 300px)' }}
      >
        {meiosPagamento.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum meio de pagamento encontrado.</p>
          </div>
        )}

        {meiosPagamento.map((meioPagamento, index) => {
          const handleRowClick = () => {
            openTabsModal({
              mode: 'edit',
              meioPagamentoId: meioPagamento.getId(),
            })
          }

          return (
          <div
            key={meioPagamento.getId()}
            onClick={handleRowClick}
            className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} cursor-pointer rounded-lg transition-colors hover:bg-secondary-bg/15`}
          >
            <div
              className={`flex items-center ${
                isCompact ? 'px-0.5 py-0.5' : 'px-1 py-1 md:px-4'
              }`}
            >
              <div
                className={`flex min-w-0 flex-[3] items-center font-normal leading-tight text-primary-text ${
                  isCompact ? 'gap-1' : 'gap-2'
                } ${textCell}`}
              >
                # <span className="truncate">{meioPagamento.getNome()}</span>
              </div>
              <div
                className={`hidden min-w-0 flex-[2] truncate font-normal leading-tight text-secondary-text md:flex ${textCell}`}
              >
                {formatarFormaPagamentoFiscal(meioPagamento.getFormaPagamentoFiscal())}
              </div>
              <div
                className="flex flex-[1] justify-center md:flex-[2]"
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
              >
                <JiffyIconSwitch
                  checked={meioPagamento.isAtivo()}
                  onChange={e => {
                    e.stopPropagation()
                    handleToggleAtivo(meioPagamento, e.target.checked)
                  }}
                  disabled={!!updatingAtivo[meioPagamento.getId()]}
                  size={switchSize}
                  className="justify-center gap-0 px-0 py-0"
                  inputProps={{
                    'aria-label': `Ativo — ${meioPagamento.getNome()}`,
                    title: meioPagamento.isAtivo() ? 'Ativo' : 'Desativado',
                  }}
                />
              </div>
              <div
                className="flex flex-[1] justify-center md:flex-[2]"
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
              >
                <JiffyIconSwitch
                  checked={meioPagamento.isDelivery()}
                  onChange={e => {
                    e.stopPropagation()
                    handleToggleIsDelivery(meioPagamento, e.target.checked)
                  }}
                  disabled={!!updatingIsDelivery[meioPagamento.getId()]}
                  size={switchSize}
                  className="justify-center gap-0 px-0 py-0"
                  inputProps={{
                    'aria-label': `Delivery — ${meioPagamento.getNome()}`,
                    title: meioPagamento.isDelivery()
                      ? 'Disponível no delivery'
                      : 'Não disponível no delivery',
                  }}
                />
              </div>
              <div
                className="flex flex-[1] justify-center md:flex-[2]"
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
              >
                {isFormaFiscalCartaoCredito(meioPagamento.getFormaPagamentoFiscal()) ? (
                  <JiffyIconSwitch
                    checked={meioPagamento.isParcelavel()}
                    onChange={e => {
                      e.stopPropagation()
                      handleToggleParcelavel(meioPagamento, e.target.checked)
                    }}
                    disabled={!!updatingParcelavel[meioPagamento.getId()]}
                    size={switchSize}
                    className="justify-center gap-0 px-0 py-0"
                    inputProps={{
                      'aria-label': `Permite parcela — ${meioPagamento.getNome()}`,
                      title: meioPagamento.isParcelavel() ? 'Permite parcela' : 'Não permite parcela',
                    }}
                  />
                ) : (
                  <span className={`text-secondary-text ${textCell}`} aria-hidden>
                    -
                  </span>
                )}
              </div>
              <div
                className="hidden flex-[2] justify-center md:flex"
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
              >
                {meioPagamento.isParcelavel() ? (
                  <select
                    value={meioPagamento.getTipoParcelamento() ?? 'jurosCliente'}
                    disabled={!!updatingTipoParcelamento[meioPagamento.getId()]}
                    onChange={e => {
                      e.stopPropagation()
                      handleChangeTipoParcelamento(
                        meioPagamento,
                        e.target.value as TipoParcelamento
                      )
                    }}
                    aria-label={`Tipo de parcelamento — ${meioPagamento.getNome()}`}
                    className={`w-full max-w-[160px] rounded-lg border border-gray-200 bg-info text-primary-text focus:border-primary focus:outline-none disabled:opacity-60 ${
                      isCompact ? 'h-7 px-1.5 text-[10px]' : 'h-8 px-2 text-xs'
                    }`}
                  >
                    {TIPOS_PARCELAMENTO_OPCOES.map(opcao => (
                      <option key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`text-secondary-text ${textCell}`} aria-hidden>
                    -
                  </span>
                )}
              </div>
              <div
                className="flex flex-[1] justify-center md:flex-[2]"
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
              >
                <JiffyIconSwitch
                  checked={meioPagamento.isTefAtivo()}
                  onChange={e => {
                    e.stopPropagation()
                    handleToggleTefAtivo(meioPagamento, e.target.checked)
                  }}
                  disabled={!!updatingTefAtivo[meioPagamento.getId()]}
                  size={switchSize}
                  className="justify-center gap-0 px-0 py-0"
                  inputProps={{
                    'aria-label': `TEF — ${meioPagamento.getNome()}`,
                    title: meioPagamento.isTefAtivo() ? 'TEF Ativo' : 'TEF Inativo',
                  }}
                />
              </div>
              <div
                className="flex flex-[1] justify-end md:flex-[2]"
                onClick={e => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    handleDeleteClick(meioPagamento.getId())
                  }}
                  className={`flex items-center justify-center rounded-lg text-error transition-colors hover:bg-error/10 ${
                    isCompact ? 'h-7 w-7' : 'h-10 w-10'
                  }`}
                  title="Deletar meio de pagamento"
                  disabled={isDeleting}
                >
                  {isDeleting && meioPagamentoToDelete === meioPagamento.getId() ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-error border-t-transparent" />
                  ) : (
                    <MdDelete size={deleteIconSize} />
                  )}
                </button>
              </div>
            </div>
          </div>
          )
        })}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <JiffyLoading />
          </div>
        )}
      </div>

      <MeiosPagamentosTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onTabChange={handleTabsModalTabChange}
        onReload={handleTabsModalReload}
      />

      {/* Modal de confirmação de exclusão */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-primary-text">
              Confirmar exclusão
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-primary-text">
              Tem certeza que deseja deletar este meio de pagamento?
            </p>
            <p className="text-sm text-secondary-text mt-2">
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <DialogFooter className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsConfirmDeleteOpen(false)
                setMeioPagamentoToDelete(null)
              }}
              disabled={isDeleting}
              className="h-10 px-6 rounded-lg border border-gray-300 text-primary-text hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="h-10 px-6 rounded-lg bg-error text-white font-semibold hover:bg-error/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deletando...' : 'Deletar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


