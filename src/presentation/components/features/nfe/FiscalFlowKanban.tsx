'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
  useTransicaoVendaGestor,
} from '@/src/presentation/hooks/useVendas'
import {
  flattenVendasUnificadasInfinite,
  useVendasUnificadasInfinite,
} from '@/src/presentation/hooks/useVendasUnificadas'
import {
  MdReceipt,
  MdSchedule,
  MdCheckCircle,
  MdPostAdd,
  MdRestaurant,
  MdLocalShipping,
  MdRoute,
} from 'react-icons/md'
import { EmitirNfeModal } from './EmitirNfeModal'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { NovoPedidoModal } from './NovoPedidoModal'
import { DeliveryConfiguracoesModal } from './DeliveryConfiguracoesModal'
import type { TipoPedido } from './EscolhaTipoPedidoModal'
import { showToast } from '@/src/shared/utils/toast'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { FaturamentoRangeCalendar } from '@/src/presentation/components/ui/FaturamentoRangeCalendar'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
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
} from './kanban/types'
import {
  COLUNAS_ENTREGA_OPERACIONAIS,
  COLUNAS_KANBAN_DESTINO_PIN,
  ordenarVendasKanbanPorCriterio,
  vendaBloqueadaParaEmissaoInterativa,
} from './kanban/fiscalFlowKanban.rules'
import {
  KANBAN_MODO_VENDAS_STORAGE_KEY,
  lerModoKanbanVendasDoStorage,
} from './kanban/fiscalFlowKanban.storage'
import { VendaCardDragPreview } from './kanban/VendaCardDragPreview'
import { FiscalKanbanToolbar } from './kanban/FiscalKanbanToolbar'
import { FiscalKanbanColumn } from './kanban/FiscalKanbanColumn'
import { FiscalKanbanVendaCard } from './kanban/FiscalKanbanVendaCard'
import { useFiscalKanbanFilters } from './kanban/useFiscalKanbanFilters'
import { useKanbanPinning } from './kanban/useKanbanPinning'
import { useEntregaTransicoesKanban } from './kanban/useEntregaTransicoesKanban'
import {
  useFiscalEmissaoKanban,
  type VendaSelecionadaParaEmissao,
} from './kanban/useFiscalEmissaoKanban'
import { useImpressaoDelivery } from '@/src/presentation/hooks/useImpressaoDelivery'
import { useKanbanColumnScrollLoadMore } from './kanban/useKanbanColumnScrollLoadMore'

/**
 * Componente Kanban para gerenciamento de pedidos e emissão fiscal.
 * O restante das regras, storage e componentes DnD fica em ./kanban.
 */
export function FiscalFlowKanban() {
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null)
  const [vendaSelecionadaParaEmissao, setVendaSelecionadaParaEmissao] =
    useState<VendaSelecionadaParaEmissao | null>(null)
  const [emitirNfeModalOpen, setEmitirNfeModalOpen] = useState(false)
  const {
    searchInput,
    setSearchInput,
    searchQuery,
    dataCriacaoInicio,
    dataCriacaoFim,
    dataFinalizacaoInicio,
    dataFinalizacaoFim,
    origemFilter,
    setOrigemFilter,
    filtrosVisiveisMobile,
    setFiltrosVisiveisMobile,
    modalCriacaoDatasAberto,
    setModalCriacaoDatasAberto,
    rascunhoCriacaoRange,
    mesCalendarioCriacao,
    setMesCalendarioCriacao,
    rascunhoHoraCriacaoInicio,
    setRascunhoHoraCriacaoInicio,
    rascunhoHoraCriacaoFim,
    setRascunhoHoraCriacaoFim,
    modalFinalizacaoDatasAberto,
    setModalFinalizacaoDatasAberto,
    rascunhoFinalizacaoRange,
    mesCalendarioFinalizacao,
    setMesCalendarioFinalizacao,
    rascunhoHoraFinalizacaoInicio,
    setRascunhoHoraFinalizacaoInicio,
    rascunhoHoraFinalizacaoFim,
    setRascunhoHoraFinalizacaoFim,
    vendasUnificadasQueryParams,
    vendasUnificadasQueryKeyFingerprint,
    handleClearFilters,
    abrirModalCriacaoDatas,
    handleRascunhoCriacaoRangeChange,
    aplicarCriacaoDatas,
    abrirModalFinalizacaoDatas,
    handleRascunhoFinalizacaoRangeChange,
    aplicarFinalizacaoDatas,
  } = useFiscalKanbanFilters()
  const { timezoneAgregacao } = useEmpresaMe()

  /** Edição de cliente (lápis no card): mesmo painel que ClientesList / SeletorClienteModal */
  const [clienteTabsModalState, setClienteTabsModalState] = useState<ClientesTabsModalState>({
    open: false,
    tab: 'cliente',
    mode: 'edit',
    clienteId: undefined,
  })

  const [novoPedidoModalOpen, setNovoPedidoModalOpen] = useState(false)
  const [deliveryConfiguracoesOpen, setDeliveryConfiguracoesOpen] = useState(false)
  /** Incrementa a cada "Novo Pedido" — nova instância do modal, evita reaproveitar estado do fluxo/tipo anterior. */
  const [novoPedidoInstanciaKey, setNovoPedidoInstanciaKey] = useState(0)
  const [novoPedidoModalVisualizacaoOpen, setNovoPedidoModalVisualizacaoOpen] = useState(false)
  const [tipoPedidoEscolhido, setTipoPedidoEscolhido] = useState<TipoPedido>('balcao')
  /** Venda aberta no modal de detalhes (step 4): id, tabela e statusFiscal do unificado (PDV não repete no GET detalhe) */
  const [pedidoVisualizacaoContext, setPedidoVisualizacaoContext] = useState<{
    id: string
    tabelaOrigem: 'venda' | 'venda_gestor'
    statusFiscal: Venda['statusFiscal']
  } | null>(null)
  const [draggingVenda, setDraggingVenda] = useState<Venda | null>(null)
  /** vendaId fixado no topo por coluna (Finalizadas / Pendente emissão), persistido em localStorage */
  const { primeiroPorColuna, setPrimeiroPorColuna } = useKanbanPinning()

  const [modoKanbanVendas, setModoKanbanVendas] = useState<ModoKanbanVendas>(() =>
    lerModoKanbanVendasDoStorage()
  )
  const [vendasVisiveisPorModo, setVendasVisiveisPorModo] = useState<
    Record<ModoKanbanVendas, Venda[]>
  >({
    delivery: [],
    balcao: [],
  })
  const contextoVisivelRef = useRef('')
  const ignorarProximaSincronizacaoAutomaticaRef = useRef(false)

  useEffect(() => {
    try {
      localStorage.setItem(KANBAN_MODO_VENDAS_STORAGE_KEY, modoKanbanVendas)
    } catch {
      /* quota / modo privado */
    }
  }, [modoKanbanVendas])

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
  }, [vendasUnificadasQueryKeyFingerprint])

  const {
    data: vendasUnificadasInfiniteData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isPlaceholderData,
  } = useVendasUnificadasInfinite(vendasUnificadasQueryParams)

  const { items: todasVendasCarregadas, totalCount: totalVendasApi } = useMemo(
    () => flattenVendasUnificadasInfinite(vendasUnificadasInfiniteData),
    [vendasUnificadasInfiniteData]
  )

  const temMaisVendasParaCarregar = useMemo(() => {
    if (hasNextPage) return true
    if (totalVendasApi > 0 && todasVendasCarregadas.length < totalVendasApi) return true
    return false
  }, [hasNextPage, totalVendasApi, todasVendasCarregadas.length])

  const handleCarregarMaisVendas = useCallback(() => {
    if (isFetchingNextPage || !temMaisVendasParaCarregar) return
    ignorarProximaSincronizacaoAutomaticaRef.current = false
    void fetchNextPage()
  }, [isFetchingNextPage, temMaisVendasParaCarregar, fetchNextPage])

  const handleAtualizarListagem = useCallback(() => {
    ignorarProximaSincronizacaoAutomaticaRef.current = false
    void refetch()
  }, [refetch])

  const { onColumnScroll } = useKanbanColumnScrollLoadMore(handleCarregarMaisVendas)

  /** Pré-carga silenciosa: após os primeiros 50, busca o restante em segundo plano (SPA). */
  useEffect(() => {
    if (isLoading || isFetchingNextPage || !temMaisVendasParaCarregar) return
    if (!todasVendasCarregadas.length) return
    const t = window.setTimeout(() => {
      ignorarProximaSincronizacaoAutomaticaRef.current = true
      void fetchNextPage()
    }, 1200)
    return () => window.clearTimeout(t)
  }, [
    isLoading,
    isFetchingNextPage,
    temMaisVendasParaCarregar,
    todasVendasCarregadas.length,
    vendasUnificadasQueryKeyFingerprint,
    fetchNextPage,
  ])

  const marcarEmissaoFiscal = useMarcarEmissaoFiscal()
  const desmarcarEmissaoFiscal = useDesmarcarEmissaoFiscal()
  const reemitirNfePdv = useReemitirNfe()
  const reemitirNfeGestor = useReemitirNfeGestor()
  const emitirNotaPdv = useEmitirNfe()
  const emitirNotaGestor = useEmitirNfeGestor()
  const transicaoVendaGestor = useTransicaoVendaGestor()
  const { processarAposTransicoes, reimprimirCupomEntrega } = useImpressaoDelivery()

  const {
    avancandoEtapaIds,
    timestampsEtapaEntregaLocal,
    handleAvancarEtapa,
    moverEntregaPorDrag,
    finalizarEntregaPorDrag,
  } = useEntregaTransicoesKanban({
    executarTransicao: payload => transicaoVendaGestor.mutateAsync(payload),
    refetch: async () => {
      ignorarProximaSincronizacaoAutomaticaRef.current = false
      await refetch()
    },
    onAfterTransicaoSucesso: async ({ venda, acoesExecutadas }) => {
      await processarAposTransicoes(venda, acoesExecutadas)
    },
  })

  const { acaoFiscalEmAndamentoPorVenda, getEtapaKanbanParaExibicao, handleEmitirNfe } =
    useFiscalEmissaoKanban({
      reemitirNfePdv: payload => reemitirNfePdv.mutateAsync(payload),
      reemitirNfeGestor: payload => reemitirNfeGestor.mutateAsync(payload),
      emitirNotaPdv: payload => emitirNotaPdv.mutateAsync(payload),
      emitirNotaGestor: payload => emitirNotaGestor.mutateAsync(payload),
      refetch: () => refetch(),
      setPrimeiroPorColuna,
      setVendaSelecionadaParaEmissao,
      setSelectedVendaId,
      setEmitirNfeModalOpen,
    })

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
            // Erro por venda: não adiciona ao Set para permitir nova tentativa após novo carregamento
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

  const separarVendasPorModo = useCallback((vendas: Venda[]) => {
    const delivery: Venda[] = []
    const balcao: Venda[] = []

    vendas.forEach(venda => {
      if (venda.isPedidoEntregaGestor()) {
        delivery.push(venda)
      } else {
        balcao.push(venda)
      }
    })

    return { delivery, balcao }
  }, [])

  const assinaturaVendaKanban = useCallback((venda: Venda) => {
    return [
      venda.id,
      venda.getEtapaKanban(),
      venda.statusEtapaOperacional ?? '',
      venda.dataUltimaModificacao ?? '',
      venda.dataFinalizacao ?? '',
      venda.dataCancelamento ?? '',
      venda.solicitarEmissaoFiscal ? '1' : '0',
      venda.statusFiscal ?? '',
      venda.documentoFiscalId ?? '',
      venda.numeroFiscal ?? '',
      venda.dataEmissaoFiscal ?? '',
      venda.valorFinal,
      venda.cliente?.id ?? '',
      venda.cliente?.nome ?? '',
    ].join('|')
  }, [])

  const totalVendasVisiveisModoAtual = vendasVisiveisPorModo[modoKanbanVendas].length

  /**
   * Mantém a UI do modo ativo estável enquanto a paginação automática aquece o cache.
   * Ao trocar modo/filtros, sincroniza imediatamente com o que já foi carregado.
   */
  useEffect(() => {
    if (isLoading || isPlaceholderData) return

    const contextoAtual = `${vendasUnificadasQueryKeyFingerprint}:${modoKanbanVendas}`
    const contextoMudou = contextoVisivelRef.current !== contextoAtual
    const vendasSeparadas = separarVendasPorModo(todasVendasCarregadas)
    const vendasDoModoAtual = vendasSeparadas[modoKanbanVendas]
    const encontrouPrimeirosItensDoModo =
      totalVendasVisiveisModoAtual === 0 && vendasDoModoAtual.length > 0

    if (!contextoMudou && isFetchingNextPage) return

    if (
      ignorarProximaSincronizacaoAutomaticaRef.current &&
      !contextoMudou &&
      !encontrouPrimeirosItensDoModo
    ) {
      ignorarProximaSincronizacaoAutomaticaRef.current = false
      return
    }

    ignorarProximaSincronizacaoAutomaticaRef.current = false
    contextoVisivelRef.current = contextoAtual
    setVendasVisiveisPorModo(prev => {
      const atuais = prev[modoKanbanVendas]
      const mesmasVendas =
        atuais.length === vendasDoModoAtual.length &&
        atuais.every((venda, index) => {
          const proximaVenda = vendasDoModoAtual[index]
          if (!proximaVenda) return false
          return assinaturaVendaKanban(venda) === assinaturaVendaKanban(proximaVenda)
        })

      if (mesmasVendas) return prev

      return {
        ...prev,
        [modoKanbanVendas]: vendasDoModoAtual,
      }
    })
  }, [
    isLoading,
    isPlaceholderData,
    isFetchingNextPage,
    modoKanbanVendas,
    assinaturaVendaKanban,
    separarVendasPorModo,
    todasVendasCarregadas,
    totalVendasVisiveisModoAtual,
    vendasUnificadasQueryKeyFingerprint,
  ])

  /** API aplica filtros globais; o modo ativo usa um snapshot visual separado. */
  const todasVendas: Venda[] = vendasVisiveisPorModo[modoKanbanVendas]

  const vendasFiltradasPorModoKanban = useMemo((): Venda[] => {
    return todasVendas
  }, [todasVendas])

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
      title: 'Em Rota',
      color: 'bg-indigo-50',
      borderColor: 'border-indigo-300',
      icon: <MdRoute className="h-4 w-4 text-indigo-700" />,
      placeholder: 'Pedidos a caminho do cliente',
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
    setTipoPedidoEscolhido(modoKanbanVendas === 'delivery' ? 'entrega' : 'balcao')
    setNovoPedidoInstanciaKey(k => k + 1)
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

  const getVendasByColumn = (columnId: string): Venda[] => {
    const vendasParaFiltrar = vendasFiltradasPorModoKanban
    let vendas: Venda[] = []

    switch (columnId) {
      case 'NOVOS_PEDIDOS':
        vendas = vendasParaFiltrar.filter(
          (v: Venda) => getEtapaKanbanParaExibicao(v) === 'NOVOS_PEDIDOS'
        )
        break
      case 'EM_PREPARO':
        vendas = vendasParaFiltrar.filter(
          (v: Venda) => getEtapaKanbanParaExibicao(v) === 'EM_PREPARO'
        )
        break
      case 'PRONTO_ENTREGA':
        vendas = vendasParaFiltrar.filter(
          (v: Venda) => getEtapaKanbanParaExibicao(v) === 'PRONTO_ENTREGA'
        )
        break
      case 'EM_ROTA':
        vendas = vendasParaFiltrar.filter(
          (v: Venda) => getEtapaKanbanParaExibicao(v) === 'EM_ROTA'
        )
        break
      case 'FINALIZADAS':
        if (modoKanbanVendas === 'delivery') {
          vendas = vendasParaFiltrar.filter((v: Venda) => {
            const etapa = getEtapaKanbanParaExibicao(v)
            return etapa === 'FINALIZADAS' || etapa === 'PENDENTE_EMISSAO'
          })
        } else {
          vendas = vendasParaFiltrar.filter(
            (v: Venda) => getEtapaKanbanParaExibicao(v) === 'FINALIZADAS'
          )
        }
        break
      case 'PENDENTE_EMISSAO':
        vendas = vendasParaFiltrar.filter(
          (v: Venda) => getEtapaKanbanParaExibicao(v) === 'PENDENTE_EMISSAO'
        )
        break
      case 'COM_NFE':
        vendas = vendasParaFiltrar.filter((v: Venda) => getEtapaKanbanParaExibicao(v) === 'COM_NFE')
        break
      default:
        return []
    }

    // Garantir que não há duplicação por ID (usando Map para manter ordem)
    const vendasUnicas = new Map<string, Venda>()
    vendas.forEach(venda => {
      if (!vendasUnicas.has(venda.id)) {
        vendasUnicas.set(venda.id, venda)
      }
    })

    const criterio =
      criterioOrdenacaoPorColuna[columnId as ColunaKanbanId] ??
      ('data' as CriterioOrdenacaoKanban)
    const direcao =
      direcaoOrdenacaoPorColuna[columnId as ColunaKanbanId] ??
      ('desc' as DirecaoOrdenacaoKanban)
    let ordenadas = ordenarVendasKanbanPorCriterio(
      Array.from(vendasUnicas.values()),
      criterio,
      direcao
    )

    // Último card movido para esta coluna fica primeiro (persistido em localStorage)
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

  const mostrarLoadingInicial = isLoading && todasVendas.length === 0

  if (mostrarLoadingInicial) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <JiffyLoading />
      </div>
    )
  }

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
        dataCriacaoInicio={dataCriacaoInicio}
        dataCriacaoFim={dataCriacaoFim}
        onOpenCriacaoDatas={abrirModalCriacaoDatas}
        dataFinalizacaoInicio={dataFinalizacaoInicio}
        dataFinalizacaoFim={dataFinalizacaoFim}
        onOpenFinalizacaoDatas={abrirModalFinalizacaoDatas}
        onClearFilters={handleClearFilters}
        modoKanbanVendas={modoKanbanVendas}
        onModoKanbanVendasChange={setModoKanbanVendas}
        onAbrirConfiguracoesDelivery={() => setDeliveryConfiguracoesOpen(true)}
        onAbrirNovoPedido={handleAbrirNovoPedido}
      />

      <DeliveryConfiguracoesModal
        open={deliveryConfiguracoesOpen}
        onClose={() => setDeliveryConfiguracoesOpen(false)}
      />

      <JiffySidePanelModal
        open={modalCriacaoDatasAberto}
        onClose={() => setModalCriacaoDatasAberto(false)}
        title="Escolha o período de criação"
        panelClassName="!bg-[#f9fafb] w-[45vw] min-w-[260px] max-w-[min(100vw-1rem,95vw)] sm:min-w-[280px]"
        scrollableBody={false}
        footerSlot={
          <button
            type="button"
            disabled={!rascunhoCriacaoRange?.from || !rascunhoCriacaoRange?.to}
            onClick={aplicarCriacaoDatas}
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
            range={rascunhoCriacaoRange}
            onRangeChange={handleRascunhoCriacaoRangeChange}
            month={mesCalendarioCriacao}
            onMonthChange={setMesCalendarioCriacao}
            timeZoneEmpresa={timezoneAgregacao}
            horaInicio={rascunhoHoraCriacaoInicio}
            horaFim={rascunhoHoraCriacaoFim}
            onHorariosChange={(hi, hf) => {
              setRascunhoHoraCriacaoInicio(hi)
              setRascunhoHoraCriacaoFim(hf)
            }}
          />
        </div>
      </JiffySidePanelModal>

      <JiffySidePanelModal
        open={modalFinalizacaoDatasAberto}
        onClose={() => setModalFinalizacaoDatasAberto(false)}
        title="Escolha o período de finalização"
        panelClassName="!bg-[#f9fafb] w-[45vw] min-w-[260px] max-w-[min(100vw-1rem,95vw)] sm:min-w-[280px]"
        scrollableBody={false}
        footerSlot={
          <button
            type="button"
            disabled={!rascunhoFinalizacaoRange?.from || !rascunhoFinalizacaoRange?.to}
            onClick={aplicarFinalizacaoDatas}
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
            range={rascunhoFinalizacaoRange}
            onRangeChange={handleRascunhoFinalizacaoRangeChange}
            month={mesCalendarioFinalizacao}
            onMonthChange={setMesCalendarioFinalizacao}
            timeZoneEmpresa={timezoneAgregacao}
            horaInicio={rascunhoHoraFinalizacaoInicio}
            horaFim={rascunhoHoraFinalizacaoFim}
            onHorariosChange={(hi, hf) => {
              setRascunhoHoraFinalizacaoInicio(hi)
              setRascunhoHoraFinalizacaoFim(hf)
            }}
          />
        </div>
      </JiffySidePanelModal>

      {/* Kanban Board */}
      <div className="scrollbar-thin mb-[10px] min-h-0 flex-1 overflow-x-auto p-2 pb-4">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex h-full min-w-max gap-3">
            {columns.map(column => {
              const columnVendas = getVendasByColumn(column.id)
              const colId = column.id as ColunaKanbanId

              return (
                <FiscalKanbanColumn
                  key={column.id}
                  column={column}
                  count={columnVendas.length}
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
                  onColumnScroll={onColumnScroll}
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
          onClienteSalvo={() => void refetch()}
        />
      )}

      {/* Modal de Novo Pedido — key nova por abertura para estado inicial consistente com tipoInicioPedido */}
      <NovoPedidoModal
        key={novoPedidoInstanciaKey}
        open={novoPedidoModalOpen}
        tipoInicioPedido={tipoPedidoEscolhido}
        onClose={() => {
          setNovoPedidoModalOpen(false)
        }}
        onSuccess={() => {
          setNovoPedidoModalOpen(false)
          refetch()
        }}
      />

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
