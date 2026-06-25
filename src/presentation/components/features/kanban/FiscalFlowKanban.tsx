'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  useMarcarEmissaoFiscal,
  useDesmarcarEmissaoFiscal,
  useReemitirNfe,
  useReemitirNfeGestor,
  useEmitirNfe,
  useEmitirNfeGestor,
  useEmitirNfeDelivery,
  useTransicaoPedidoDelivery,
} from '@/src/presentation/hooks/useVendas'
import {
  flattenVendasUnificadasInfinite,
  useVendasUnificadasInfinite,
  vendasUnificadasInfiniteQueryKey,
} from './hooks/useVendasUnificadas'
import {
  flattenPedidosDeliveryInfinite,
  vendasUnificadasQueryParamsParaPedidosDelivery,
} from './hooks/usePedidosDeliveryInfinite'
import { usePedidosDeliveryKanbanColumns } from './hooks/usePedidosDeliveryKanbanColumns'
import { usePedidosDeliveryContagemPorStatus } from './hooks/usePedidosDeliveryContagemPorStatus'
import { combinarContagensColunasDeliveryKanban } from './utils/kanbanDeliveryColumnCounts'
import { useVendaIdsPdvPorTerminal } from '@/src/presentation/hooks/useVendaIdsPdvPorTerminal'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'
import { useEntregadoresQuery } from '@/src/presentation/components/features/pedidos/hooks/data/useEntregadoresQuery'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import {
  MdReceipt,
  MdSchedule,
  MdCheckCircle,
  MdPostAdd,
  MdRestaurant,
  MdLocalShipping,
  MdRoute,
} from 'react-icons/md'
import { EmitirNfeModal } from '../fiscal/EmitirNfeModal'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { NovoPedidoModal } from '../pedidos/NovoPedidoModal'
import { DeliveryConfiguracoesModal } from '../delivery/configuracoes/DeliveryConfiguracoesModal'
import type { TipoPedido } from '../pedidos/components/EscolhaTipoPedidoModal'
import { showToast } from '@/src/shared/utils/toast'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { FaturamentoRangeCalendar } from '@/src/presentation/components/ui/FaturamentoRangeCalendar'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  ClientesTabsModal,
  ClientesTabsModalState,
} from '@/src/presentation/components/features/clientes/ClientesTabsModal'
import type { ModoKanbanVendas } from './KanbanModoVendasToggle'
import type {
  ColunaKanbanId,
  CriterioOrdenacaoKanban,
  DirecaoOrdenacaoKanban,
  KanbanColumn,
  Venda,
} from './types'
import {
  COLUNAS_ENTREGA_OPERACIONAIS,
  COLUNAS_KANBAN_DESTINO_PIN,
  ordenarVendasKanbanPorCriterio,
  vendaBloqueadaParaEmissaoInterativa,
  vendaExigeEntregadorParaDespachar,
} from './rules/fiscalFlowKanban.rules'
import {
  KANBAN_MODO_VENDAS_STORAGE_KEY,
  lerModoKanbanVendasDoStorage,
} from './rules/fiscalFlowKanban.storage'
import { VendaCardDragPreview } from './components/VendaCardDragPreview'
import { FiscalKanbanToolbar } from './components/FiscalKanbanToolbar'
import { FiscalKanbanColumn } from './components/FiscalKanbanColumn'
import { FiscalKanbanVendaCard } from './components/FiscalKanbanVendaCard'
import { useFiscalKanbanFilters } from './hooks/useFiscalKanbanFilters'
import { useKanbanPinning } from './hooks/useKanbanPinning'
import { useEntregaTransicoesKanban } from '../delivery/kanban-panels/useEntregaTransicoesKanban'
import {
  extrairPatchKanbanDeRespostaTransicao,
  extrairVendaUnificadaDeRespostaDeliverySummary,
  patchVendaUnificadaInfiniteCache,
  replaceVendaUnificadaInfiniteCache,
} from './utils/kanbanVendaCacheUpdate'
import {
  patchVendaDeliveryKanbanColumnCaches,
  upsertVendaDeliveryKanbanColumnCaches,
} from './utils/kanbanDeliveryColumnCache'
import {
  DELIVERY_KANBAN_COLUMN_IDS,
  isColunaKanbanDeliveryFiscalSplit,
  vendaPertenceColunaDeliveryKanban,
} from './utils/kanbanDeliveryColumnConfig'
import { invalidarPedidoKanbanQuickViewCache } from '../delivery/kanban-panels/carregarPedidoKanbanQuickView'
import {
  resolverEntregadorIdVendaKanban,
  hidratarEntregadoresKanbanDesdeApi,
  hidratarEntregadoresKanbanDesdeSummary,
  entregadorKanbanJaVerificado,
  definirEntregadorKanbanCache,
} from '../delivery/kanban-panels/entregadorKanbanStore'
import {
  useFiscalEmissaoKanban,
  type VendaSelecionadaParaEmissao,
} from './hooks/useFiscalEmissaoKanban'
import { useImpressaoDelivery } from '../delivery/hooks/useImpressaoDelivery'
import { validarImpressaoAntesTransicaoKanban } from '@/src/application/delivery/validarImpressaoAntesTransicaoKanban'
import { confirmarCobrancaPendentePedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/ConfirmarCobrancaPendentePedidoDeliveryUseCase'
import type { AcaoTransicaoGestor } from '@/src/presentation/hooks/useVendas'
import { useKanbanColumnScrollLoadMore } from './hooks/useKanbanColumnScrollLoadMore'
import {
  filtrarVendaDeliveryKanbanColunaPorDatasToolbar,
  filtrarVendasKanbanPorModo,
  KANBAN_DELIVERY_DELTA_POLL_INTERVAL_MS,
  KANBAN_VENDAS_REFETCH_INTERVAL_MS,
} from './utils/kanbanVendasListagem'

type TerminalOpcao = { id: string; nome: string }

/**
 * Componente Kanban para gerenciamento de pedidos e emissão fiscal.
 * O restante das regras, storage e componentes DnD fica em ./kanban.
 */
export function FiscalFlowKanban() {
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null)
  const [vendaSelecionadaParaEmissao, setVendaSelecionadaParaEmissao] =
    useState<VendaSelecionadaParaEmissao | null>(null)
  const [emitirNfeModalOpen, setEmitirNfeModalOpen] = useState(false)
  const { timezoneAgregacao, preferenciasImpressaoDelivery, empresa } = useEmpresaMe()
  const {
    searchInput,
    setSearchInput,
    searchQuery,
    periodoPreset,
    periodoInicioConsulta,
    periodoFimConsulta,
    origemFilter,
    setOrigemFilter,
    filtrosVisiveisMobile,
    setFiltrosVisiveisMobile,
    modalPeriodoDatasAberto,
    setModalPeriodoDatasAberto,
    rascunhoPeriodoRange,
    mesCalendarioPeriodo,
    setMesCalendarioPeriodo,
    rascunhoHoraPeriodoInicio,
    setRascunhoHoraPeriodoInicio,
    rascunhoHoraPeriodoFim,
    setRascunhoHoraPeriodoFim,
    vendasUnificadasQueryParams,
    handleClearFilters,
    handleRascunhoPeriodoRangeChange,
    aplicarPeriodoDatas,
    aplicarPeriodoPreset,
  } = useFiscalKanbanFilters(timezoneAgregacao)
  const { auth } = useAuthStore()
  const hasKanbanToken = !!auth?.getAccessToken()
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const [entregadorPorVendaId, setEntregadorPorVendaId] = useState<Record<string, string>>({})

  /** Edição de cliente (lápis no card): mesmo painel que ClientesList / SeletorClienteModal */
  const [clienteTabsModalState, setClienteTabsModalState] = useState<ClientesTabsModalState>({
    open: false,
    tab: 'cliente',
    mode: 'edit',
    clienteId: undefined,
  })

  const [novoPedidoModalOpen, setNovoPedidoModalOpen] = useState(false)
  const [deliveryConfiguracoesOpen, setDeliveryConfiguracoesOpen] = useState(false)
  /** Monta o modal de criar pedido só enquanto aberto ou na animação de saída */
  const [novoPedidoCriarContext, setNovoPedidoCriarContext] = useState<{
    instanciaKey: number
    tipoInicioPedido: TipoPedido
  } | null>(null)
  const [novoPedidoModalVisualizacaoOpen, setNovoPedidoModalVisualizacaoOpen] = useState(false)
  /** Venda aberta no modal de detalhes (step 4): id, tabela e statusFiscal do unificado (PDV não repete no GET detalhe) */
  const [pedidoVisualizacaoContext, setPedidoVisualizacaoContext] = useState<{
    id: string
    tabelaOrigem: 'venda' | 'venda_gestor'
    statusFiscal: Venda['statusFiscal']
    tipoVenda?: string | null
    abaDetalhesInicial?: import('../pedidos/types').AbaDetalhesPedido
  } | null>(null)
  const [draggingVenda, setDraggingVenda] = useState<Venda | null>(null)
  const [confirmandoCobrancaIds, setConfirmandoCobrancaIds] = useState<Record<string, boolean>>({})
  const [terminalFilter, setTerminalFilter] = useState('')
  const [terminais, setTerminais] = useState<TerminalOpcao[]>([])
  const [isLoadingTerminais, setIsLoadingTerminais] = useState(false)
  /** vendaId fixado no topo por coluna (Finalizadas / Pendente emissão), persistido em localStorage */
  const { primeiroPorColuna, setPrimeiroPorColuna } = useKanbanPinning()

  const [modoKanbanVendas, setModoKanbanVendas] = useState<ModoKanbanVendas>(() =>
    lerModoKanbanVendasDoStorage()
  )

  useEffect(() => {
    try {
      localStorage.setItem(KANBAN_MODO_VENDAS_STORAGE_KEY, modoKanbanVendas)
    } catch {
      /* quota / modo privado */
    }
  }, [modoKanbanVendas])

  const isModoDeliveryKanban = modoKanbanVendas === 'delivery'

  /** Período unificado: criação nas colunas operacionais; finalização nas colunas fiscais. */
  const enviarFiltroCriacaoNaDeliveryApi = Boolean(
    vendasUnificadasQueryParams.dataCriacaoInicial || vendasUnificadasQueryParams.dataCriacaoFinal
  )
  const enviarFiltroFinalizacaoNaDeliveryApi = Boolean(
    vendasUnificadasQueryParams.dataFinalizacaoInicio ||
      vendasUnificadasQueryParams.dataFinalizacaoFim
  )

  const { data: meiosPagamentoInfiniteData } = useMeiosPagamentoInfinite({
    ativo: true,
    limit: 100,
    enabled: isModoDeliveryKanban,
  })

  /** Pré-carrega entregadores no cache React Query para o painel lateral do card. */
  useEntregadoresQuery({
    enabled: hasKanbanToken && isModoDeliveryKanban,
    token: auth?.getAccessToken(),
  })

  const nomesMeiosPagamentoKanban = useMemo(() => {
    const mapa: Record<string, string> = {}
    const pages = meiosPagamentoInfiniteData?.pages ?? []
    for (const page of pages) {
      for (const meio of page.meiosPagamento) {
        mapa[meio.getId()] = meio.getNome()
      }
    }
    return mapa
  }, [meiosPagamentoInfiniteData])

  const pedidosDeliveryQueryParams = useMemo(
    () => vendasUnificadasQueryParamsParaPedidosDelivery(vendasUnificadasQueryParams),
    [vendasUnificadasQueryParams]
  )

  const infiniteQueryKey = useMemo(
    () =>
      isModoDeliveryKanban
        ? ['delivery', 'pedidos', 'infinite', empresaId, 'columns'] as const
        : vendasUnificadasInfiniteQueryKey(vendasUnificadasQueryParams, empresaId),
    [
      isModoDeliveryKanban,
      vendasUnificadasQueryParams,
      empresaId,
    ]
  )

  const getEtapaKanbanParaExibicaoRef = useRef<(v: Venda) => string>(v => v.getEtapaKanban())

  const loadAllTerminais = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoadingTerminais(true)
    try {
      const allTerminais: TerminalOpcao[] = []
      let currentOffset = 0
      const limit = 50
      let hasMore = true

      while (hasMore) {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
        })

        const response = await fetch(`/api/terminais?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) break

        const data = await response.json()
        const newTerminais = (data.items || []).map((t: Record<string, unknown>) => ({
          id: String(t.id),
          nome: String(t.nome || t.name || t.codigoInterno || 'Sem nome'),
        }))

        allTerminais.push(...newTerminais)
        hasMore = newTerminais.length === limit
        currentOffset += newTerminais.length
      }

      setTerminais(allTerminais)
    } catch (error) {
      console.error('Erro ao carregar terminais:', error)
    } finally {
      setIsLoadingTerminais(false)
    }
  }, [auth])

  useEffect(() => {
    if (isModoDeliveryKanban) return
    void loadAllTerminais()
  }, [isModoDeliveryKanban, loadAllTerminais])

  useEffect(() => {
    if (isModoDeliveryKanban && terminalFilter) {
      setTerminalFilter('')
    }
  }, [isModoDeliveryKanban, terminalFilter])

  const usaFiltroTerminal = !!terminalFilter.trim() && !isModoDeliveryKanban

  const vendaIdsPdvPorTerminalParams = useMemo(
    () => ({
      terminalId: terminalFilter,
      periodoInicial: vendasUnificadasQueryParams.dataCriacaoInicial,
      periodoFinal: vendasUnificadasQueryParams.dataCriacaoFinal,
      dataFinalizacaoInicio: vendasUnificadasQueryParams.dataFinalizacaoInicio,
      dataFinalizacaoFim: vendasUnificadasQueryParams.dataFinalizacaoFim,
    }),
    [terminalFilter, vendasUnificadasQueryParams]
  )

  const vendasUnificadasQueryKeyFingerprintComTerminal = useMemo(
    () =>
      JSON.stringify({
        modo: modoKanbanVendas,
        ...(isModoDeliveryKanban
          ? pedidosDeliveryQueryParams
          : {
              ...vendasUnificadasQueryParams,
              terminalFilter: terminalFilter || undefined,
            }),
      }),
    [
      modoKanbanVendas,
      isModoDeliveryKanban,
      pedidosDeliveryQueryParams,
      vendasUnificadasQueryParams,
      terminalFilter,
    ]
  )

  /** Evita PATCH duplicado ao reativar solicitarEmissaoFiscal para REJEITADA (Strict Mode / re-renders) */
  const rejeitadaReativacaoEmAndamentoRef = useRef(false)
  /** IDs já reativados com sucesso — evita loop infinito se o GET ainda vier inconsistente (base de testes). */
  const rejeitadaReativacaoJaTentadaIdsRef = useRef<Set<string>>(new Set())

  /** Ordenação individual por coluna: padrão sempre por data (reset ao recarregar a página). */
  const [criterioOrdenacaoPorColuna, setCriterioOrdenacaoPorColuna] = useState<
    Record<ColunaKanbanId, CriterioOrdenacaoKanban>
  >({
    NOVOS_PEDIDOS: 'data',
    EM_PREPARO: 'data',
    PRONTO_ENTREGA: 'data',
    EM_ROTA: 'data',
    FINALIZADAS: 'data',
    PENDENTE_EMISSAO: 'data',
    COM_NFE: 'data',
  })
  /** Direção (crescente/decrescente) individual por coluna — reset ao recarregar. */
  const [direcaoOrdenacaoPorColuna, setDirecaoOrdenacaoPorColuna] = useState<
    Record<ColunaKanbanId, DirecaoOrdenacaoKanban>
  >({
    NOVOS_PEDIDOS: 'desc',
    EM_PREPARO: 'desc',
    PRONTO_ENTREGA: 'desc',
    EM_ROTA: 'desc',
    FINALIZADAS: 'desc',
    PENDENTE_EMISSAO: 'desc',
    COM_NFE: 'desc',
  })

  useEffect(() => {
    rejeitadaReativacaoJaTentadaIdsRef.current = new Set()
  }, [vendasUnificadasQueryKeyFingerprintComTerminal])

  const {
    data: vendasUnificadasInfiniteData,
    isLoading: isLoadingUnificado,
    isFetchingNextPage: isFetchingNextPageUnificado,
    hasNextPage: hasNextPageUnificado,
    fetchNextPage: fetchNextPageUnificado,
    refetch: refetchUnificado,
  } = useVendasUnificadasInfinite(vendasUnificadasQueryParams, {
    // Mantém cache do balcão ao alternar modo; polling só no modo ativo.
    enabled: hasKanbanToken,
    refetchIntervalMs: !isModoDeliveryKanban ? KANBAN_VENDAS_REFETCH_INTERVAL_MS : false,
    refetchOnWindowFocus: !isModoDeliveryKanban,
  })

  const deliveryKanban = usePedidosDeliveryKanbanColumns(pedidosDeliveryQueryParams, {
    enabled: hasKanbanToken && isModoDeliveryKanban,
    refetchIntervalMs: isModoDeliveryKanban ? KANBAN_DELIVERY_DELTA_POLL_INTERVAL_MS : false,
    refetchOnWindowFocus: isModoDeliveryKanban,
    getEtapaKanban: v => getEtapaKanbanParaExibicaoRef.current(v),
    enviarFiltroCriacaoNaApi: enviarFiltroCriacaoNaDeliveryApi,
    enviarFiltroFinalizacaoNaApi: enviarFiltroFinalizacaoNaDeliveryApi,
  })

  const deliveryContagem = usePedidosDeliveryContagemPorStatus(pedidosDeliveryQueryParams, {
    enabled: hasKanbanToken && isModoDeliveryKanban,
    enviarFiltroCriacaoNaApi: enviarFiltroCriacaoNaDeliveryApi,
    enviarFiltroFinalizacaoNaApi: enviarFiltroFinalizacaoNaDeliveryApi,
  })

  const isLoadingDelivery = deliveryKanban.isLoading
  const refetchDelivery = deliveryKanban.refetch

  const isFetchingNextPage = isModoDeliveryKanban
    ? DELIVERY_KANBAN_COLUMN_IDS.some(
        id => deliveryKanban.columnStates[id]?.isFetchingNextPage
      )
    : isFetchingNextPageUnificado
  const hasNextPage = isModoDeliveryKanban
    ? DELIVERY_KANBAN_COLUMN_IDS.some(id => deliveryKanban.columnStates[id]?.hasNextPage)
    : hasNextPageUnificado
  const fetchNextPage = isModoDeliveryKanban
    ? () => undefined
    : fetchNextPageUnificado

  const {
    data: vendaIdsPdvPorTerminal,
    isLoading: isLoadingIdsTerminal,
    refetch: refetchIdsTerminal,
  } = useVendaIdsPdvPorTerminal(vendaIdsPdvPorTerminalParams, { enabled: usaFiltroTerminal })

  const isLoading = isModoDeliveryKanban
    ? isLoadingDelivery
    : isLoadingUnificado || (usaFiltroTerminal && isLoadingIdsTerminal)

  const refetch = useCallback(async () => {
    if (isModoDeliveryKanban) {
      await Promise.all([refetchDelivery(), deliveryContagem.refetch()])
      return
    }
    const [result] = await Promise.all([
      refetchUnificado(),
      usaFiltroTerminal ? refetchIdsTerminal() : Promise.resolve(),
    ])
    return result
  }, [
    isModoDeliveryKanban,
    usaFiltroTerminal,
    refetchDelivery,
    deliveryContagem.refetch,
    refetchUnificado,
    refetchIdsTerminal,
  ])

  /** Normaliza refetch do infinite query para `refetchAteMudarStatusFiscal` (espera `{ data: { items } }`). */
  const refetchParaEmissaoFiscal = useCallback(async () => {
    if (isModoDeliveryKanban) {
      await Promise.all([refetchDelivery(), deliveryContagem.refetch()])
      const items = deliveryKanban.flattenAllItems()
      return { data: { items } }
    }
    const result = await refetchUnificado()
    const { items } = flattenVendasUnificadasInfinite(result.data)
    return { data: { items } }
  }, [isModoDeliveryKanban, refetchDelivery, deliveryContagem.refetch, deliveryKanban.flattenAllItems, refetchUnificado])

  const deliveryKanbanColumnStatesKey = useMemo(
    () => JSON.stringify(deliveryKanban.columnStates),
    [deliveryKanban.columnStates]
  )

  const flattenAllItemsDelivery = deliveryKanban.flattenAllItems

  const { items: todasVendasFlattened, totalCount: totalVendasApi } = useMemo(() => {
    if (isModoDeliveryKanban) {
      const items = flattenAllItemsDelivery()
      return { items, totalCount: items.length }
    }
    return flattenVendasUnificadasInfinite(vendasUnificadasInfiniteData)
  }, [
    isModoDeliveryKanban,
    deliveryKanbanColumnStatesKey,
    flattenAllItemsDelivery,
    vendasUnificadasInfiniteData,
  ])

  /** Lista do unificado; com terminal, só PDV cujo id está no Set do POS. */
  const todasVendasCarregadas = useMemo(() => {
    if (!usaFiltroTerminal) return todasVendasFlattened
    if (!vendaIdsPdvPorTerminal) return []
    return todasVendasFlattened.filter(
      v => v.tabelaOrigem === 'venda' && vendaIdsPdvPorTerminal.has(v.id)
    )
  }, [usaFiltroTerminal, vendaIdsPdvPorTerminal, todasVendasFlattened])

  const entregadoresHydrationKey = useMemo(
    () =>
      todasVendasCarregadas
        .filter(
          v =>
            v.isPedidoEntregaGestor() &&
            String(v.tipoVenda ?? '').trim().toLowerCase() === 'entrega'
        )
        .filter(v =>
          COLUNAS_ENTREGA_OPERACIONAIS.includes(
            getEtapaKanbanParaExibicaoRef.current(v) as ColunaKanbanId
          )
        )
        .filter(v => {
          if (String(v.entregador?.id ?? '').trim()) return false
          if (entregadorPorVendaId[v.id]?.trim()) return false
          if (entregadorKanbanJaVerificado(v.id)) return false
          return true
        })
        .map(v => v.id)
        .sort()
        .join('|'),
    [todasVendasCarregadas, entregadorPorVendaId]
  )

  const entregadorPorVendaIdRef = useRef(entregadorPorVendaId)
  entregadorPorVendaIdRef.current = entregadorPorVendaId

  const todasVendasCarregadasRef = useRef(todasVendasCarregadas)
  todasVendasCarregadasRef.current = todasVendasCarregadas

  const entregadoresHydrationEmAndamentoRef = useRef(false)

  useEffect(() => {
    if (modoKanbanVendas !== 'delivery') return
    if (isLoadingDelivery) return
    const token = auth?.getAccessToken()
    if (!token || !entregadoresHydrationKey) return
    if (entregadoresHydrationEmAndamentoRef.current) return

    const idsParaHidratar = entregadoresHydrationKey.split('|').filter(Boolean)
    if (idsParaHidratar.length === 0) return

    entregadoresHydrationEmAndamentoRef.current = true
    let cancelled = false

    void (async () => {
      const vendasRef = todasVendasCarregadasRef.current
        .filter(
          v =>
            idsParaHidratar.includes(v.id) &&
            v.isPedidoEntregaGestor() &&
            String(v.tipoVenda ?? '').trim().toLowerCase() === 'entrega' &&
            COLUNAS_ENTREGA_OPERACIONAIS.includes(
              getEtapaKanbanParaExibicaoRef.current(v) as ColunaKanbanId
            )
        )
        .map(v => ({
          id: v.id,
          tabelaOrigem:
            v.tabelaOrigem === 'venda_gestor' ? ('venda_gestor' as const) : ('venda' as const),
          tipoVenda: v.tipoVenda,
          entregador: v.entregador,
        }))

      if (vendasRef.length === 0) {
        entregadoresHydrationEmAndamentoRef.current = false
        return
      }

      const updatesSummary = hidratarEntregadoresKanbanDesdeSummary(vendasRef)
      if (Object.keys(updatesSummary).length > 0) {
        setEntregadorPorVendaId(prev => {
          const next = { ...prev }
          let changed = false
          for (const [vendaId, entregadorId] of Object.entries(updatesSummary)) {
            if (next[vendaId] !== entregadorId) {
              next[vendaId] = entregadorId
              changed = true
            }
          }
          return changed ? next : prev
        })
      }

      const idsJaConhecidos = new Set([
        ...Object.keys(updatesSummary),
        ...Object.entries(entregadorPorVendaIdRef.current)
          .filter(([, entregadorId]) => entregadorId?.trim())
          .map(([vendaId]) => vendaId),
      ])
      for (const venda of vendasRef) {
        if (entregadorKanbanJaVerificado(venda.id)) {
          idsJaConhecidos.add(venda.id)
        }
      }

      const updates = await hidratarEntregadoresKanbanDesdeApi({
        vendas: vendasRef,
        token,
        idsJaConhecidos,
      })

      entregadoresHydrationEmAndamentoRef.current = false

      if (cancelled || Object.keys(updates).length === 0) return

      setEntregadorPorVendaId(prev => {
        const next = { ...prev }
        let changed = false
        for (const [vendaId, entregadorId] of Object.entries(updates)) {
          if (next[vendaId] !== entregadorId) {
            next[vendaId] = entregadorId
            changed = true
          }
        }
        return changed ? next : prev
      })
    })()

    return () => {
      cancelled = true
    }
  }, [auth, modoKanbanVendas, entregadoresHydrationKey, isLoadingDelivery])

  const temMaisVendasParaCarregar = useMemo(() => {
    if (isModoDeliveryKanban) return false
    if (hasNextPage) return true
    if (
      !usaFiltroTerminal &&
      totalVendasApi > 0 &&
      todasVendasCarregadas.length < totalVendasApi
    ) {
      return true
    }
    return false
  }, [
    isModoDeliveryKanban,
    hasNextPage,
    usaFiltroTerminal,
    totalVendasApi,
    todasVendasCarregadas.length,
  ])

  const handleCarregarMaisVendas = useCallback(() => {
    if (isModoDeliveryKanban) return
    if (isFetchingNextPage || !temMaisVendasParaCarregar) return
    void fetchNextPage()
  }, [
    isModoDeliveryKanban,
    isFetchingNextPage,
    temMaisVendasParaCarregar,
    fetchNextPage,
  ])

  const { onColumnScroll: onGlobalColumnScroll } =
    useKanbanColumnScrollLoadMore(handleCarregarMaisVendas)

  const columnScrollTickingRef = useRef(false)

  const deliveryColumnStatesRef = useRef(deliveryKanban.columnStates)
  deliveryColumnStatesRef.current = deliveryKanban.columnStates

  const fetchNextPageForColumnDelivery = deliveryKanban.fetchNextPageForColumn

  const handleColumnScroll = useCallback(
    (columnId: ColunaKanbanId, event: React.UIEvent<HTMLDivElement>) => {
      if (isModoDeliveryKanban) {
        const state = deliveryColumnStatesRef.current[columnId]
        if (!state?.hasNextPage || state.isFetchingNextPage) return
        if (columnScrollTickingRef.current) return
        const el = event.currentTarget
        if (!el) return
        columnScrollTickingRef.current = true
        requestAnimationFrame(() => {
          columnScrollTickingRef.current = false
          const distanciaDoFim = el.scrollHeight - el.scrollTop - el.clientHeight
          if (distanciaDoFim <= 120) {
            fetchNextPageForColumnDelivery(columnId)
          }
        })
        return
      }
      onGlobalColumnScroll(event)
    },
    [isModoDeliveryKanban, fetchNextPageForColumnDelivery, onGlobalColumnScroll]
  )

  const deliveryColumnCounts = useMemo((): Record<string, number> => {
    if (!isModoDeliveryKanban) return {}

    const finalizadasState = deliveryKanban.columnStates.FINALIZADAS
    const { items: poolFinalizados } = flattenPedidosDeliveryInfinite(finalizadasState?.data)

    const finalizadoTotal = Math.max(
      deliveryContagem.finalizadoTotal,
      finalizadasState?.totalCount ?? 0
    )

    return combinarContagensColunasDeliveryKanban(
      deliveryContagem.operacional,
      finalizadoTotal,
      poolFinalizados,
      v => getEtapaKanbanParaExibicaoRef.current(v),
      finalizadasState?.hasNextPage ?? false,
      deliveryKanban.columnStates
    )
  }, [
    isModoDeliveryKanban,
    deliveryContagem.operacional,
    deliveryContagem.finalizadoTotal,
    deliveryKanbanColumnStatesKey,
    deliveryKanban.columnStates,
  ])

  const handleAtualizarListagem = useCallback(() => {
    void refetch()
  }, [refetch])

  const handleClearFiltersComTerminal = useCallback(() => {
    handleClearFilters()
    setTerminalFilter('')
  }, [handleClearFilters])

  const marcarEmissaoFiscal = useMarcarEmissaoFiscal()
  const desmarcarEmissaoFiscal = useDesmarcarEmissaoFiscal()
  const reemitirNfePdv = useReemitirNfe()
  const reemitirNfeGestor = useReemitirNfeGestor()
  const emitirNotaPdv = useEmitirNfe()
  const emitirNotaGestor = useEmitirNfeGestor()
  const emitirNotaDelivery = useEmitirNfeDelivery()

  const sincronizarVendaAposTransicao = useCallback(
    (vendaId: string, respostaTransicao: unknown): boolean => {
      const cardAtualizado = extrairVendaUnificadaDeRespostaDeliverySummary(respostaTransicao)
      if (cardAtualizado) {
        if (isModoDeliveryKanban) {
          upsertVendaDeliveryKanbanColumnCaches(queryClient, cardAtualizado)
        } else {
          replaceVendaUnificadaInfiniteCache(queryClient, infiniteQueryKey, cardAtualizado)
        }
        if (cardAtualizado.entregador?.id) {
          definirEntregadorKanbanCache(vendaId, cardAtualizado.entregador.id)
          setEntregadorPorVendaId(prev => ({
            ...prev,
            [vendaId]: cardAtualizado.entregador!.id,
          }))
        }
        return true
      }

      const patch = extrairPatchKanbanDeRespostaTransicao(respostaTransicao)
      if (isModoDeliveryKanban) {
        patchVendaDeliveryKanbanColumnCaches(queryClient, vendaId, patch)
      } else {
        patchVendaUnificadaInfiniteCache(queryClient, infiniteQueryKey, vendaId, patch)
      }
      return false
    },
    [isModoDeliveryKanban, infiniteQueryKey, queryClient]
  )

  const transicaoPedidoDelivery = useTransicaoPedidoDelivery({
    onPedidoTransicionado: sincronizarVendaAposTransicao,
  })

  const agendarSincronizacaoLista = useCallback(
    (vendaId: string) => {
      const token = auth?.getAccessToken()
      if (!token) return
      void (async () => {
        try {
          const response = await fetch(
            `/api/delivery/pedidos/${encodeURIComponent(vendaId)}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
              },
              cache: 'no-store',
            }
          )
          if (!response.ok) return
          const data = await response.json()
          const patch = extrairPatchKanbanDeRespostaTransicao(data)
          if (isModoDeliveryKanban) {
            patchVendaDeliveryKanbanColumnCaches(queryClient, vendaId, patch)
          } else {
            patchVendaUnificadaInfiniteCache(queryClient, infiniteQueryKey, vendaId, patch)
          }
        } catch {
          /* falha silenciosa */
        }
      })()
    },
    [auth, isModoDeliveryKanban, infiniteQueryKey, queryClient]
  )

  const revalidarPagamentoAntesFinalizar = useCallback(
    async (vendaId: string) => {
      const token = auth?.getAccessToken()
      if (!token) return false
      try {
        const response = await fetch(`/api/delivery/pedidos/${encodeURIComponent(vendaId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        })
        if (!response.ok) return false
        const data = await response.json()
        const patch = extrairPatchKanbanDeRespostaTransicao(data)
        if (isModoDeliveryKanban) {
          patchVendaDeliveryKanbanColumnCaches(queryClient, vendaId, patch)
        } else {
          patchVendaUnificadaInfiniteCache(queryClient, infiniteQueryKey, vendaId, patch)
        }
        const status = String(patch.statusFinanceiro ?? '').trim().toLowerCase()
        return status === 'pago'
      } catch {
        return false
      }
    },
    [auth, isModoDeliveryKanban, infiniteQueryKey, queryClient]
  )

  const abrirConfigImpressoraExpedicao = useCallback(() => {
    setDeliveryConfiguracoesOpen(true)
  }, [])

  const { processarAposTransicoes, reimprimirCupomEntrega } = useImpressaoDelivery({
    onImpressoraExpedicaoNecessaria: abrirConfigImpressoraExpedicao,
  })

  const verificarImpressaoAntesTransicoes = useCallback(
    async (venda: Venda, acoes: AcaoTransicaoGestor[]) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Sessão expirada.')
        return { ok: false }
      }

      const resultado = await validarImpressaoAntesTransicaoKanban({
        vendaId: venda.id,
        token,
        prefs: preferenciasImpressaoDelivery,
        empresa,
        acoes,
      })

      for (const info of resultado.toastsInfo ?? []) {
        showToast.info(info)
      }

      if (resultado.podeAvancar) {
        return { ok: true, ticketsPayload: resultado.ticketsPayload }
      }

      if (resultado.toastWarning) {
        showToast.warning(resultado.toastWarning)
      }
      if (resultado.abrirModalConfig) {
        abrirConfigImpressoraExpedicao()
      }
      return { ok: false }
    },
    [abrirConfigImpressoraExpedicao, auth, empresa, preferenciasImpressaoDelivery]
  )

  const verificarEntregadorAntesDespachar = useCallback(
    async (venda: Venda) => {
      if (!vendaExigeEntregadorParaDespachar(venda)) {
        return true
      }
      const token = auth?.getAccessToken()
      if (!token) return false
      const entregadorId = await resolverEntregadorIdVendaKanban({
        vendaId: venda.id,
        tabelaOrigem: venda.tabelaOrigem === 'venda_gestor' ? 'venda_gestor' : 'venda',
        token,
        cacheLocal: entregadorPorVendaId,
      })
      return Boolean(entregadorId)
    },
    [auth, entregadorPorVendaId]
  )

  const handlePagamentoPendenteAoFinalizar = useCallback((venda: Venda) => {
    showToast.warning('Confirme o pagamento para finalizar o pedido.')
    setPedidoVisualizacaoContext({
      id: venda.id,
      tabelaOrigem: venda.tabelaOrigem,
      statusFiscal: venda.statusFiscal,
      tipoVenda: venda.tipoVenda,
      abaDetalhesInicial: 'pagamentos',
    })
    setNovoPedidoModalVisualizacaoOpen(true)
  }, [])

  const handleConfirmarCobrancaKanban = useCallback(
    async (venda: Venda) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Sessão expirada.')
        return
      }

      setConfirmandoCobrancaIds(prev => ({ ...prev, [venda.id]: true }))
      try {
        const pedidoAtualizado = await confirmarCobrancaPendentePedidoDeliveryUseCase.execute(
          venda.id,
          token
        )
        const patch = extrairPatchKanbanDeRespostaTransicao(pedidoAtualizado)
        if (isModoDeliveryKanban) {
          patchVendaDeliveryKanbanColumnCaches(queryClient, venda.id, patch)
        } else {
          patchVendaUnificadaInfiniteCache(queryClient, infiniteQueryKey, venda.id, patch)
        }
        invalidarPedidoKanbanQuickViewCache(venda.id)
        showToast.success('Cobrança confirmada.')
      } catch (error) {
        const mensagem =
          error instanceof Error ? error.message : 'Não foi possível confirmar a cobrança.'
        showToast.error(mensagem)
        agendarSincronizacaoLista(venda.id)
      } finally {
        setConfirmandoCobrancaIds(prev => {
          const next = { ...prev }
          delete next[venda.id]
          return next
        })
      }
    },
    [auth, agendarSincronizacaoLista, isModoDeliveryKanban, infiniteQueryKey, queryClient]
  )

  const {
    avancandoEtapaIds,
    etapaLocalPorVendaId,
    timestampsEtapaEntregaLocal,
    handleAvancarEtapa,
    moverEntregaPorDrag,
    finalizarEntregaPorDrag,
  } = useEntregaTransicoesKanban({
    executarTransicao: payload => transicaoPedidoDelivery.mutateAsync(payload),
    sincronizarVendaAposTransicao,
    agendarSincronizacaoLista,
    onAfterTransicaoSucesso: ({ venda, acoesExecutadas, ticketsPreload }) => {
      void processarAposTransicoes(venda, acoesExecutadas, ticketsPreload)
    },
    verificarImpressaoAntesTransicoes,
    verificarEntregadorAntesDespachar,
    onPagamentoPendenteAoFinalizar: handlePagamentoPendenteAoFinalizar,
    revalidarPagamentoAntesFinalizar,
  })

  const { acaoFiscalEmAndamentoPorVenda, getEtapaKanbanParaExibicao: getEtapaKanbanFiscal, handleEmitirNfe } =
    useFiscalEmissaoKanban({
      reemitirNfePdv: payload => reemitirNfePdv.mutateAsync(payload),
      reemitirNfeGestor: payload => reemitirNfeGestor.mutateAsync(payload),
      emitirNotaPdv: payload => emitirNotaPdv.mutateAsync(payload),
      emitirNotaGestor: payload => emitirNotaGestor.mutateAsync(payload),
      emitirNotaDelivery: payload => emitirNotaDelivery.mutateAsync(payload),
      refetch: () => refetchParaEmissaoFiscal(),
      setPrimeiroPorColuna,
      setVendaSelecionadaParaEmissao,
      setSelectedVendaId,
      setEmitirNfeModalOpen,
    })

  const getEtapaKanbanParaExibicao = useCallback(
    (venda: Venda) => {
      if (acaoFiscalEmAndamentoPorVenda[venda.id]) {
        return getEtapaKanbanFiscal(venda)
      }
      const etapaLocal = etapaLocalPorVendaId[venda.id]
      if (etapaLocal) return etapaLocal
      return getEtapaKanbanFiscal(venda)
    },
    [acaoFiscalEmAndamentoPorVenda, etapaLocalPorVendaId, getEtapaKanbanFiscal]
  )

  getEtapaKanbanParaExibicaoRef.current = getEtapaKanbanParaExibicao

  // REJEITADA com solicitarEmissaoFiscal false: reativa com o mesmo PATCH de "marcar emissão" (useMarcarEmissaoFiscal)
  useEffect(() => {
    if (
      isLoading ||
      !todasVendasCarregadas.length ||
      rejeitadaReativacaoEmAndamentoRef.current
    )
      return

    const pendentes = todasVendasCarregadas.filter(v => {
      const rejeitada =
        String(v.statusFiscal ?? '')
          .trim()
          .toUpperCase() === 'REJEITADA'
      return (
        rejeitada &&
        !v.solicitarEmissaoFiscal &&
        !v.isPedidoEntregaGestor() &&
        !rejeitadaReativacaoJaTentadaIdsRef.current.has(v.id)
      )
    })
    if (pendentes.length === 0) return

    rejeitadaReativacaoEmAndamentoRef.current = true
    let cancelled = false
    void (async () => {
      try {
        let sucesso = 0
        for (const v of pendentes) {
          if (cancelled) break
          try {
            await marcarEmissaoFiscal.mutateAsync({
              id: v.id,
              tabelaOrigem: v.tabelaOrigem,
              silent: true,
            })
            rejeitadaReativacaoJaTentadaIdsRef.current.add(v.id)
            sucesso += 1
          } catch {
            // Evita retentar a mesma venda em re-renders; sem toast (silent).
            rejeitadaReativacaoJaTentadaIdsRef.current.add(v.id)
          }
        }
        if (!cancelled && sucesso > 0) {
          showToast.info(
            sucesso === 1
              ? 'Solicitação de emissão reativada para a venda com nota rejeitada.'
              : `Solicitação de emissão reativada para ${sucesso} vendas com nota rejeitada.`
          )
        }
      } finally {
        rejeitadaReativacaoEmAndamentoRef.current = false
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoading, todasVendasCarregadas, marcarEmissaoFiscal])

  // Só PointerSensor: em touch, pointermove fica no document (melhor que TouchSensor no alvo + scroll).
  // TouchSensor junto com PointerSensor gerava gesto “travado” no mobile; distance evita arraste ao rolar.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }))

  const todasVendas = useMemo(() => {
    if (isModoDeliveryKanban) return todasVendasCarregadas
    return filtrarVendasKanbanPorModo(todasVendasCarregadas, modoKanbanVendas)
  }, [isModoDeliveryKanban, todasVendasCarregadas, modoKanbanVendas])

  const vendasPorColuna = useMemo(() => {
    const ordenarColuna = (columnId: string, vendas: Venda[]): Venda[] => {
      const vendasUnicas = new Map<string, Venda>()
      vendas.forEach(venda => {
        if (!vendasUnicas.has(venda.id)) {
          vendasUnicas.set(venda.id, venda)
        }
      })

      const colId = columnId as ColunaKanbanId
      const criterio = criterioOrdenacaoPorColuna[colId] ?? ('data' as CriterioOrdenacaoKanban)
      const direcao = direcaoOrdenacaoPorColuna[colId] ?? ('desc' as DirecaoOrdenacaoKanban)
      let ordenadas = ordenarVendasKanbanPorCriterio(
        Array.from(vendasUnicas.values()),
        criterio,
        direcao
      )

      const pinId = primeiroPorColuna[columnId]
      if (pinId) {
        const idx = ordenadas.findIndex(v => v.id === pinId)
        if (idx > 0) {
          const [pinned] = ordenadas.splice(idx, 1)
          ordenadas = [pinned, ...ordenadas]
        }
      }

      return ordenadas
    }

    if (isModoDeliveryKanban) {
      const map: Partial<Record<ColunaKanbanId, Venda[]>> = {}
      for (const columnId of DELIVERY_KANBAN_COLUMN_IDS) {
        const state = deliveryKanban.columnStates[columnId]
        const { items } = flattenPedidosDeliveryInfinite(state?.data)
        let vendas = items.filter(v => {
          if (
            isColunaKanbanDeliveryFiscalSplit(columnId) &&
            !vendaPertenceColunaDeliveryKanban(v, columnId, getEtapaKanbanParaExibicao)
          ) {
            return false
          }
          return filtrarVendaDeliveryKanbanColunaPorDatasToolbar(
            v,
            columnId,
            vendasUnificadasQueryParams
          )
        })

        if (!isColunaKanbanDeliveryFiscalSplit(columnId)) {
          for (const [vendaId, colunaDestino] of Object.entries(etapaLocalPorVendaId)) {
            if (colunaDestino !== columnId) continue
            if (vendas.some(v => v.id === vendaId)) continue
            const vendaTransicao = todasVendasCarregadas.find(v => v.id === vendaId)
            if (
              vendaTransicao &&
              filtrarVendaDeliveryKanbanColunaPorDatasToolbar(
                vendaTransicao,
                columnId,
                vendasUnificadasQueryParams
              )
            ) {
              vendas = [...vendas, vendaTransicao]
            }
          }
        }

        map[columnId] = ordenarColuna(columnId, vendas)
      }
      return map
    }

    const construirListaColuna = (columnId: string): Venda[] => {
      let vendas: Venda[] = []
      switch (columnId) {
        case 'NOVOS_PEDIDOS':
          vendas = todasVendas.filter(
            (v: Venda) => getEtapaKanbanParaExibicao(v) === 'NOVOS_PEDIDOS'
          )
          break
        case 'EM_PREPARO':
          vendas = todasVendas.filter(
            (v: Venda) => getEtapaKanbanParaExibicao(v) === 'EM_PREPARO'
          )
          break
        case 'PRONTO_ENTREGA':
          vendas = todasVendas.filter(
            (v: Venda) => getEtapaKanbanParaExibicao(v) === 'PRONTO_ENTREGA'
          )
          break
        case 'EM_ROTA':
          vendas = todasVendas.filter(
            (v: Venda) => getEtapaKanbanParaExibicao(v) === 'EM_ROTA'
          )
          break
        case 'FINALIZADAS':
          vendas = todasVendas.filter(
            (v: Venda) => getEtapaKanbanParaExibicao(v) === 'FINALIZADAS'
          )
          break
        case 'PENDENTE_EMISSAO':
          vendas = todasVendas.filter(
            (v: Venda) => getEtapaKanbanParaExibicao(v) === 'PENDENTE_EMISSAO'
          )
          break
        case 'COM_NFE':
          vendas = todasVendas.filter(
            (v: Venda) => getEtapaKanbanParaExibicao(v) === 'COM_NFE'
          )
          break
        default:
          return []
      }

      return ordenarColuna(columnId, vendas)
    }

    const ids: ColunaKanbanId[] = [
      'NOVOS_PEDIDOS',
      'EM_PREPARO',
      'PRONTO_ENTREGA',
      'EM_ROTA',
      'FINALIZADAS',
      'PENDENTE_EMISSAO',
      'COM_NFE',
    ]
    const map: Partial<Record<ColunaKanbanId, Venda[]>> = {}
    for (const id of ids) {
      map[id] = construirListaColuna(id)
    }
    return map
  }, [
    todasVendas,
    modoKanbanVendas,
    isModoDeliveryKanban,
    deliveryKanban.columnStates,
    getEtapaKanbanParaExibicao,
    etapaLocalPorVendaId,
    todasVendasCarregadas,
    criterioOrdenacaoPorColuna,
    direcaoOrdenacaoPorColuna,
    primeiroPorColuna,
    vendasUnificadasQueryParams,
  ])

  const getColumnTotalCount = useCallback(
    (columnId: ColunaKanbanId): number => {
      if (isModoDeliveryKanban) {
        if (deliveryColumnCounts[columnId] != null) {
          return deliveryColumnCounts[columnId]
        }
        const listApiTotal = deliveryKanban.columnStates[columnId]?.totalCount
        if (typeof listApiTotal === 'number') {
          return listApiTotal
        }
        return 0
      }
      return vendasPorColuna[columnId]?.length ?? 0
    },
    [isModoDeliveryKanban, deliveryColumnCounts, deliveryKanban.columnStates, vendasPorColuna]
  )

  // Colunas fixas do Kanban (entrega → fiscal)
  const getColumns = (): KanbanColumn[] => [
    {
      id: 'NOVOS_PEDIDOS',
      title: 'Novos Pedidos',
      color: 'bg-sky-50',
      borderColor: 'border-sky-300',
      icon: <MdPostAdd className="h-4 w-4 text-sky-700" />,
      placeholder: 'Pedidos recém-criados aguardando triagem',
    },
    {
      id: 'EM_PREPARO',
      title: 'Em Preparo',
      color: 'bg-amber-50',
      borderColor: 'border-amber-300',
      icon: <MdRestaurant className="h-4 w-4 text-amber-700" />,
      placeholder: 'Pedidos em preparação na cozinha ou separação',
    },
    {
      id: 'PRONTO_ENTREGA',
      title: 'Pronto para entrega',
      color: 'bg-teal-50',
      borderColor: 'border-teal-300',
      icon: <MdLocalShipping className="h-4 w-4 text-teal-700" />,
      placeholder: 'Pedidos prontos para retirada ou envio',
    },
    {
      id: 'EM_ROTA',
      title: 'Em Rota / Retirada',
      color: 'bg-indigo-50',
      borderColor: 'border-indigo-300',
      icon: <MdRoute className="h-4 w-4 text-indigo-700" />,
      placeholder: 'Pedidos a caminho do cliente ou prontos para retirada',
    },
    {
      id: 'FINALIZADAS',
      title: 'Finalizadas',
      color: 'bg-primary/15',
      borderColor: 'border-gray-400',
      icon: <MdReceipt className="h-4 w-4 text-gray-600" />,
      placeholder: 'Vendas finalizadas aguardando ação',
    },
    {
      id: 'PENDENTE_EMISSAO',
      title: 'Pendente Emissão Fiscal',
      color: 'bg-yellow-50',
      borderColor: 'border-yellow-400',
      icon: <MdSchedule className="h-4 w-4 text-yellow-600" />,
      placeholder: 'Vendas aguardando emissão de NFe',
    },
    {
      id: 'COM_NFE',
      title: 'Com Nota Solicitada',
      color: 'bg-green-50',
      borderColor: 'border-green-400',
      icon: <MdCheckCircle className="h-4 w-4 text-green-600" />,
      placeholder: 'Vendas com nota fiscal solicitada',
    },
  ]

  const todasColunasKanban = getColumns()
  const columns =
    modoKanbanVendas === 'delivery'
      ? todasColunasKanban.filter(c => c.id !== 'PENDENTE_EMISSAO')
      : todasColunasKanban.filter(
          c => !COLUNAS_ENTREGA_OPERACIONAIS.includes(c.id as ColunaKanbanId)
        )

  const handleMarcarEmissaoFiscal = async (
    vendaId: string,
    tabelaOrigem: 'venda' | 'venda_gestor'
  ) => {
    try {
      await marcarEmissaoFiscal.mutateAsync({ id: vendaId, tabelaOrigem })
    } catch (error) {
      console.error('Erro ao marcar emissão fiscal:', error)
    }
  }

  // Ao soltar: Finalizadas → Pendente Emissão = marcar; Pendente Emissão → Finalizadas = desmarcar
  // - Só chama marcar se solicitarEmissaoFiscal ainda não é true (evita requisição ao soltar de volta na mesma coluna sem mudar de etapa).
  // - Só chama desmarcar se solicitarEmissaoFiscal é true (evita requisição ao soltar em Finalizadas sem ter vindo de Pendente).
  // - statusFiscal REJEITADA: não permite soltar em Finalizadas (toast sempre, mesmo com solicitarEmissaoFiscal false).
  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingVenda(null)
    const { active, over } = event
    if (!over) return
    const venda = active.data.current?.venda as Venda | undefined
    if (!venda) return

    const overIdStr = String(over.id)

    if (COLUNAS_ENTREGA_OPERACIONAIS.includes(overIdStr as ColunaKanbanId)) {
      if (!venda.isPedidoEntregaGestor()) {
        showToast.info('Estas colunas são apenas para pedidos de entrega.')
        return
      }
      const origemEtapa = getEtapaKanbanParaExibicao(venda)
      if (!COLUNAS_ENTREGA_OPERACIONAIS.includes(origemEtapa as ColunaKanbanId)) {
        showToast.info('Arraste apenas pedidos que estão nas etapas de entrega.')
        return
      }
      const origIdx = COLUNAS_ENTREGA_OPERACIONAIS.indexOf(origemEtapa as ColunaKanbanId)
      const destIdx = COLUNAS_ENTREGA_OPERACIONAIS.indexOf(overIdStr as ColunaKanbanId)
      if (origIdx < 0 || destIdx < 0) return
      if (destIdx === origIdx) return
      if (destIdx < origIdx) {
        showToast.info('Não é possível voltar uma etapa arrastando o card.')
        return
      }
      void moverEntregaPorDrag(venda, origIdx, destIdx)
      return
    }

    if (over.id === 'PENDENTE_EMISSAO') {
      if (venda.solicitarEmissaoFiscal !== true) {
        handleMarcarEmissaoFiscal(venda.id, venda.tabelaOrigem)
      }
    } else if (over.id === 'FINALIZADAS') {
      // Rejeitada pode estar com solicitarEmissaoFiscal false — o bloqueio não pode depender só desse flag
      const fiscalRejeitada =
        String(venda.statusFiscal ?? '')
          .trim()
          .toUpperCase() === 'REJEITADA'
      if (fiscalRejeitada) {
        showToast.warning(
          'Vendas com nota rejeitada não podem ser movidas para Finalizadas. Use Reemitir na coluna Pendente Emissão.'
        )
        return
      }
      const emRotaGestor =
        venda.isPedidoEntregaGestor() &&
        getEtapaKanbanParaExibicao(venda) === 'EM_ROTA'
      if (emRotaGestor) {
        void finalizarEntregaPorDrag(venda)
      } else if (venda.solicitarEmissaoFiscal === true) {
        handleDesmarcarEmissaoFiscal(venda.id, venda.tabelaOrigem)
      }
    } else if (over.id === 'COM_NFE') {
      // Só a partir de Pendente emissão: mesmo fluxo do botão Emitir / Reemitir
      if (venda.getEtapaKanban() !== 'PENDENTE_EMISSAO') {
        showToast.info(
          'Arraste para esta coluna apenas vendas que estão em Pendente emissão fiscal.'
        )
        return
      }
      if (vendaBloqueadaParaEmissaoInterativa(venda, acaoFiscalEmAndamentoPorVenda)) {
        showToast.info(
          'Esta venda não pode ser emitida neste status. Use o botão quando estiver disponível.'
        )
        return
      }
      void handleEmitirNfe(venda)
    }

    // Card solto: mantém no topo na coluna de destino (localStorage)
    const colunaDestino = String(over.id)
    if (COLUNAS_KANBAN_DESTINO_PIN.has(colunaDestino)) {
      const origemKanban = venda.getEtapaKanban()
      setPrimeiroPorColuna(prev => {
        const next = { ...prev }
        if (
          (origemKanban === 'FINALIZADAS' || origemKanban === 'PENDENTE_EMISSAO') &&
          prev[origemKanban] === venda.id
        ) {
          delete next[origemKanban]
        }
        next[colunaDestino] = venda.id
        return next
      })
    }
  }

  const handleDesmarcarEmissaoFiscal = async (
    vendaId: string,
    tabelaOrigem: 'venda' | 'venda_gestor'
  ) => {
    try {
      await desmarcarEmissaoFiscal.mutateAsync({ id: vendaId, tabelaOrigem })
    } catch (error) {
      console.error('Erro ao desmarcar emissão fiscal:', error)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const venda = event.active.data.current?.venda as Venda | undefined
    if (venda) setDraggingVenda(venda)
  }

  const handleDragCancel = () => {
    setDraggingVenda(null)
  }

  const handleViewDetails = (venda: Venda) => {
    setPedidoVisualizacaoContext({
      id: venda.id,
      tabelaOrigem: venda.tabelaOrigem,
      statusFiscal: venda.statusFiscal,
      tipoVenda: venda.tipoVenda,
    })
    setNovoPedidoModalVisualizacaoOpen(true)
  }

  const handleAbrirEdicaoCliente = useCallback((clienteId: string) => {
    setClienteTabsModalState({
      open: true,
      tab: 'cliente',
      mode: 'edit',
      clienteId,
    })
  }, [])

  const handleFecharClienteTabsModal = useCallback(() => {
    setClienteTabsModalState({
      open: false,
      tab: 'cliente',
      mode: 'edit',
      clienteId: undefined,
    })
  }, [])

  const handleTabChangeClienteModal = useCallback((tab: 'cliente' | 'visualizar') => {
    setClienteTabsModalState(prev => ({ ...prev, tab }))
  }, [])

  /** Novo pedido: tipo alinhado ao modo do quadro (Delivery → entrega, Balcão → balcão); nova instância limpa o formulário. */
  const handleAbrirNovoPedido = useCallback(() => {
    setNovoPedidoCriarContext({
      instanciaKey: Date.now(),
      tipoInicioPedido: modoKanbanVendas === 'delivery' ? 'entrega' : 'balcao',
    })
    setNovoPedidoModalOpen(true)
  }, [modoKanbanVendas])

  // Obter vendas de delivery por status — COMENTADO: delivery não utilizado por enquanto
  // NOTA: Para delivery, o backend retorna vendas finalizadas OU com status '4' sem dataFinalizacao (COM_ENTREGADOR)
  const getVendasDeliveryPorStatus = (_status: string | number): Venda[] => {
    // const todasVendasUnificadas = todasVendas
    // const mostrarDelivery = todosFiltrosSelecionados || tipoVendaFiltros.length === 0 || tipoVendaFiltros.includes('delivery')
    // const vendasFiltradas = mostrarDelivery ? todasVendasUnificadas.filter((v: Venda) => v.isDelivery()) : []
    // return vendasFiltradas.filter((venda: Venda) => { ... })
    return []
  }

  const mostrarLoadingLista = isLoading && todasVendas.length === 0

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <FiscalKanbanToolbar
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onRefresh={handleAtualizarListagem}
        filtrosVisiveisMobile={filtrosVisiveisMobile}
        onToggleFiltrosMobile={() => setFiltrosVisiveisMobile(prev => !prev)}
        origemFilter={origemFilter}
        onOrigemFilterChange={setOrigemFilter}
        terminalFilter={terminalFilter}
        onTerminalFilterChange={setTerminalFilter}
        terminais={terminais}
        isLoadingTerminais={isLoadingTerminais}
        origemFilterDisabled={usaFiltroTerminal}
        periodoPreset={periodoPreset}
        onPeriodoPresetChange={aplicarPeriodoPreset}
        periodoInicio={periodoInicioConsulta}
        periodoFim={periodoFimConsulta}
        onClearFilters={handleClearFiltersComTerminal}
        modoKanbanVendas={modoKanbanVendas}
        onModoKanbanVendasChange={setModoKanbanVendas}
        onAbrirConfiguracoesDelivery={() => setDeliveryConfiguracoesOpen(true)}
        onAbrirNovoPedido={handleAbrirNovoPedido}
      />

      {deliveryConfiguracoesOpen ? (
        <DeliveryConfiguracoesModal
          open
          onClose={() => setDeliveryConfiguracoesOpen(false)}
        />
      ) : null}

      <JiffySidePanelModal
        open={modalPeriodoDatasAberto}
        onClose={() => setModalPeriodoDatasAberto(false)}
        title="Escolha o período"
        panelClassName="!bg-[#f9fafb] w-[45vw] min-w-[260px] max-w-[min(100vw-1rem,95vw)] sm:min-w-[280px]"
        scrollableBody={false}
        footerSlot={
          <button
            type="button"
            disabled={!rascunhoPeriodoRange?.from || !rascunhoPeriodoRange?.to}
            onClick={aplicarPeriodoDatas}
            className="rounded-b-l-lg font-nunito flex h-full w-full items-center justify-center bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Aplicar
          </button>
        }
      >
        <div className="flex min-h-0 w-full flex-1 flex-col items-stretch justify-start overflow-x-auto overflow-y-auto">
          <FaturamentoRangeCalendar
            embutidoNoModal
            embutidoFundoClaro
            range={rascunhoPeriodoRange}
            onRangeChange={handleRascunhoPeriodoRangeChange}
            month={mesCalendarioPeriodo}
            onMonthChange={setMesCalendarioPeriodo}
            timeZoneEmpresa={timezoneAgregacao}
            horaInicio={rascunhoHoraPeriodoInicio}
            horaFim={rascunhoHoraPeriodoFim}
            onHorariosChange={(hi, hf) => {
              setRascunhoHoraPeriodoInicio(hi)
              setRascunhoHoraPeriodoFim(hf)
            }}
          />
        </div>
      </JiffySidePanelModal>

      {/* Kanban Board — loading só na área das colunas; toolbar permanece visível */}
      <div className="scrollbar-thin mb-[10px] min-h-0 flex-1 overflow-x-auto p-2 pb-4">
        {mostrarLoadingLista ? (
          <div className="flex h-full min-h-[200px] items-center justify-center">
            <JiffyLoading />
          </div>
        ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex h-full min-w-max gap-3">
            {columns.map(column => {
              const colId = column.id as ColunaKanbanId
              const columnTotalCount = getColumnTotalCount(colId)
              const columnVendas = vendasPorColuna[colId] ?? []

              return (
                <FiscalKanbanColumn
                  key={column.id}
                  column={column}
                  count={columnTotalCount}
                  criterioOrdenacao={criterioOrdenacaoPorColuna[colId] ?? 'data'}
                  direcaoOrdenacao={direcaoOrdenacaoPorColuna[colId] ?? 'desc'}
                  onCriterioOrdenacaoChange={(columnId, criterio) =>
                    setCriterioOrdenacaoPorColuna(prev => ({
                      ...prev,
                      [columnId]: criterio,
                    }))
                  }
                  onToggleDirecaoOrdenacao={columnId =>
                    setDirecaoOrdenacaoPorColuna(prev => ({
                      ...prev,
                      [columnId]: prev[columnId] === 'asc' ? 'desc' : 'asc',
                    }))
                  }
                  onColumnScroll={handleColumnScroll}
                  columnFooter={
                    isModoDeliveryKanban &&
                    deliveryKanban.columnStates[colId]?.isFetchingNextPage
                      ? (
                          <p className="py-2 text-center text-xs text-gray-500">
                            Carregando mais vendas…
                          </p>
                        )
                      : undefined
                  }
                >
                  {columnVendas.map((venda: Venda) => (
                    <FiscalKanbanVendaCard
                      key={venda.id}
                      venda={venda}
                      column={column}
                      modoKanbanVendas={modoKanbanVendas}
                      acaoFiscalEmAndamentoPorVenda={acaoFiscalEmAndamentoPorVenda}
                      avancandoEtapaIds={avancandoEtapaIds}
                      timestampsEtapaEntregaLocal={timestampsEtapaEntregaLocal}
                      onViewDetails={handleViewDetails}
                      onAbrirEdicaoCliente={handleAbrirEdicaoCliente}
                      onAvancarEtapa={(vendaAtual, colunaAtual) =>
                        void handleAvancarEtapa(vendaAtual, colunaAtual)
                      }
                      onEmitirNfe={vendaAtual => void handleEmitirNfe(vendaAtual)}
                      onReimprimirCupomDelivery={
                        modoKanbanVendas === 'delivery'
                          ? (vendaAtual, colunaAtual) =>
                              void reimprimirCupomEntrega(vendaAtual, colunaAtual)
                          : undefined
                      }
                      entregadorVinculadoId={
                        entregadorPorVendaId[venda.id] ?? venda.entregador?.id ?? null
                      }
                      onEntregadorAtualizado={(vendaId, entregadorId) => {
                        definirEntregadorKanbanCache(vendaId, entregadorId)
                        setEntregadorPorVendaId(prev => {
                          if (!entregadorId) {
                            const { [vendaId]: _removido, ...resto } = prev
                            return resto
                          }
                          return { ...prev, [vendaId]: entregadorId }
                        })
                      }}
                      onConfirmarCobranca={
                        modoKanbanVendas === 'delivery'
                          ? vendaAtual => void handleConfirmarCobrancaKanban(vendaAtual)
                          : undefined
                      }
                      confirmandoCobrancaIds={confirmandoCobrancaIds}
                      nomesMeiosPagamento={nomesMeiosPagamentoKanban}
                    />
                  ))}
                </FiscalKanbanColumn>
              )
            })}
          </div>
          <DragOverlay dropAnimation={null}>
            {draggingVenda ? <VendaCardDragPreview venda={draggingVenda} /> : null}
          </DragOverlay>
        </DndContext>
        )}
        {!mostrarLoadingLista && isFetchingNextPage && !isModoDeliveryKanban ? (
          <p className="px-2 pb-2 text-center text-xs text-gray-500">Carregando mais vendas…</p>
        ) : null}
      </div>

      {/* Modal de Emissão de NFe */}
      {vendaSelecionadaParaEmissao && (
        <EmitirNfeModal
          open={emitirNfeModalOpen}
          onClose={() => {
            setEmitirNfeModalOpen(false)
            setSelectedVendaId(null)
            setVendaSelecionadaParaEmissao(null)
          }}
          vendaId={vendaSelecionadaParaEmissao.id}
          vendaNumero={vendaSelecionadaParaEmissao.numeroVenda?.toString()}
          origemVenda={vendaSelecionadaParaEmissao.origemVenda}
          codigoVenda={vendaSelecionadaParaEmissao.codigoVenda}
          clienteId={vendaSelecionadaParaEmissao.clienteId}
          clienteNome={vendaSelecionadaParaEmissao.clienteNome}
          tabelaOrigem={vendaSelecionadaParaEmissao.tabelaOrigem}
          tipoVenda={vendaSelecionadaParaEmissao.tipoVenda}
          onClienteSalvo={() => void refetch()}
        />
      )}

      {/* Modal de Novo Pedido — montado só ao abrir; desmonta após animação de saída */}
      {novoPedidoCriarContext && (
        <NovoPedidoModal
          key={novoPedidoCriarContext.instanciaKey}
          open={novoPedidoModalOpen}
          tipoInicioPedido={novoPedidoCriarContext.tipoInicioPedido}
          onClose={() => {
            setNovoPedidoModalOpen(false)
          }}
          onAfterClose={() => {
            setNovoPedidoCriarContext(null)
          }}
          onSuccess={() => {
            setNovoPedidoModalOpen(false)
            refetch()
          }}
        />
      )}

      {/* Modal de visualização: contexto só some após onExited do painel */}
      {pedidoVisualizacaoContext && (
        <NovoPedidoModal
          open={novoPedidoModalVisualizacaoOpen}
          onClose={() => {
            setNovoPedidoModalVisualizacaoOpen(false)
          }}
          onAfterClose={() => {
            setPedidoVisualizacaoContext(null)
          }}
          onSuccess={() => {
            setNovoPedidoModalVisualizacaoOpen(false)
            refetch()
          }}
          vendaId={pedidoVisualizacaoContext.id}
          tabelaOrigemVenda={pedidoVisualizacaoContext.tabelaOrigem}
          statusFiscalUnificado={pedidoVisualizacaoContext.statusFiscal}
          tipoVendaGestor={pedidoVisualizacaoContext.tipoVenda}
          tipoInicioPedido={
            modoKanbanVendas === 'delivery' ||
            pedidoVisualizacaoContext.tipoVenda === 'entrega' ||
            pedidoVisualizacaoContext.tipoVenda === 'retirada'
              ? 'entrega'
              : 'balcao'
          }
          abaDetalhesInicial={pedidoVisualizacaoContext.abaDetalhesInicial}
          modoVisualizacao={true}
        />
      )}

      <ClientesTabsModal
        state={clienteTabsModalState}
        onClose={handleFecharClienteTabsModal}
        onReload={() => void refetch()}
        onTabChange={handleTabChangeClienteModal}
      />
    </div>
  )
}
