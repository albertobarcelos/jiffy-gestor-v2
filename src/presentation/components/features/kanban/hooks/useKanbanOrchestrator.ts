'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useReemitirNfe,
  useReemitirNfeGestor,
  useEmitirNfe,
  useEmitirNfeGestor,
  useEmitirNfeDelivery,
  useTransicaoPedidoDelivery,
} from '@/src/presentation/hooks/useVendas'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { usePreferenciasImpressaoDelivery } from '@/src/presentation/hooks/usePreferenciasImpressaoDelivery'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { invalidateVendaDetalheCarregadaCache } from '../../pedidos/hooks/data/useVendaDetalheCarregadaQuery'
import { useEntregaTransicoesKanban } from '../../delivery/kanban-panels/useEntregaTransicoesKanban'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type { ColunaKanbanId, CriterioOrdenacaoKanban, Venda } from '../types'
import {
  KANBAN_MODO_VENDAS_STORAGE_KEY,
  lerModoKanbanVendasDoStorage,
} from '../rules/vendasKanban.storage'
import type { KanbanBoardRendererProps } from '../components/KanbanBoardRenderer'
import type { KanbanModaisRendererProps } from '../components/KanbanModaisRenderer'
import { useKanbanFilters } from './useKanbanFilters'
import { useKanbanPinning } from './useKanbanPinning'
import { useFiscalEmissaoKanban } from './useFiscalEmissaoKanban'
import { useReemissaoFiscalEmLote } from './useReemissaoFiscalEmLote'
import { useKanbanDataQueries } from './useKanbanDataQueries'
import { useKanbanEntregadorSync } from './useKanbanEntregadorSync'
import { useKanbanVendasPorColuna } from './useKanbanVendasPorColuna'
import { useKanbanPreTransicao } from './useKanbanPreTransicao'
import { useKanbanDragDrop } from './useKanbanDragDrop'
import { useKanbanModais } from './useKanbanModais'
import { getVisibleKanbanColumns } from '../utils/kanbanColumnsConfig'

export interface KanbanToolbarProps {
  searchInput: string
  onSearchInputChange: (value: string) => void
  onRefresh: () => void | Promise<void>
  filtrosVisiveisMobile: boolean
  onToggleFiltrosMobile: () => void
  origemFilter: ReturnType<typeof useKanbanFilters>['origemFilter']
  onOrigemFilterChange: ReturnType<typeof useKanbanFilters>['setOrigemFilter']
  tipoEntregaFilter: ReturnType<typeof useKanbanFilters>['tipoEntregaFilter']
  onTipoEntregaFilterChange: ReturnType<typeof useKanbanFilters>['setTipoEntregaFilter']
  colunaKanbanFiltro: ReturnType<typeof useKanbanFilters>['colunaKanbanFiltro']
  onColunaKanbanFiltroChange: ReturnType<typeof useKanbanFilters>['setColunaKanbanFiltro']
  terminalFilter: string
  onTerminalFilterChange: (value: string) => void
  terminais: { id: string; nome: string }[]
  isLoadingTerminais: boolean
  origemFilterDisabled?: boolean
  periodoPreset: ReturnType<typeof useKanbanFilters>['periodoPreset']
  onPeriodoPresetChange: ReturnType<typeof useKanbanFilters>['aplicarPeriodoPreset']
  periodoInicio: ReturnType<typeof useKanbanFilters>['periodoInicioConsulta']
  periodoFim: ReturnType<typeof useKanbanFilters>['periodoFimConsulta']
  onClearFilters: () => void
  modoKanbanVendas: ModoKanbanVendas
  onModoKanbanVendasChange: (value: ModoKanbanVendas) => void
  onAbrirConfiguracoesDelivery: () => void
  onAbrirNovoPedido: () => void
}

export function useKanbanOrchestrator() {
  const { timezoneAgregacao, empresa } = useEmpresaMe()
  const { preferenciasImpressaoDelivery } = usePreferenciasImpressaoDelivery()
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  const filters = useKanbanFilters(timezoneAgregacao)
  const {
    searchInput,
    setSearchInput,
    origemFilter,
    setOrigemFilter,
    tipoEntregaFilter,
    setTipoEntregaFilter,
    colunaKanbanFiltro,
    setColunaKanbanFiltro,
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
    periodoPreset,
    periodoInicioConsulta,
    periodoFimConsulta,
  } = filters

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

  const { primeiroPorColuna, setPrimeiroPorColuna } = useKanbanPinning()
  const getEtapaKanbanParaExibicaoRef = useRef<(v: Venda) => string>(v => v.getEtapaKanban())
  const entregadorPorVendaIdRef = useRef<Record<string, string>>({})
  const patchEntregadorFnRef = useRef<(vendaId: string, entregadorId: string) => void>(() => {})

  const data = useKanbanDataQueries({
    modoKanbanVendas,
    vendasUnificadasQueryParams,
    getEtapaKanbanParaExibicaoRef,
    tipoEntregaFilter,
    setTipoEntregaFilter,
    colunaKanbanFiltro,
  })

  const modais = useKanbanModais(modoKanbanVendas)

  const preTransicao = useKanbanPreTransicao({
    isModoDeliveryKanban: data.isModoDeliveryKanban,
    infiniteQueryKey: data.infiniteQueryKey,
    todasVendasCarregadasRef: data.todasVendasCarregadasRef,
    entregadorPorVendaIdRef,
    onPatchEntregadorPorVendaId: (vendaId, entregadorId) => {
      entregadorPorVendaIdRef.current = {
        ...entregadorPorVendaIdRef.current,
        [vendaId]: entregadorId,
      }
      patchEntregadorFnRef.current(vendaId, entregadorId)
    },
    preferenciasImpressaoDelivery,
    empresa,
    onAbrirConfigImpressoraExpedicao: modais.abrirConfigImpressoraExpedicao,
  })

  const transicaoPedidoDelivery = useTransicaoPedidoDelivery({
    onPedidoTransicionado: preTransicao.sincronizarVendaAposTransicao,
  })

  const [vendaIdAbrirEntregador, setVendaIdAbrirEntregador] = useState<string | null>(null)

  const {
    avancandoEtapaIds,
    etapaLocalPorVendaId,
    deltaContagemColunasTransicao,
    timestampsEtapaEntregaLocal,
    limparEstadoUiTransicao,
    handleAvancarEtapa,
    moverEntregaPorDrag,
    finalizarEntregaPorDrag,
  } = useEntregaTransicoesKanban({
    executarTransicao: payload => transicaoPedidoDelivery.mutateAsync(payload),
    sincronizarVendaAposTransicao: preTransicao.sincronizarVendaAposTransicao,
    agendarSincronizacaoLista: preTransicao.agendarSincronizacaoLista,
    onAfterTransicaoSucesso: ({ venda, acoesExecutadas, ticketsPreload }) => {
      void preTransicao.processarAposTransicoes(venda, acoesExecutadas, ticketsPreload)
    },
    verificarImpressaoAntesTransicoes: preTransicao.verificarImpressaoAntesTransicoes,
    verificarEntregadorAntesDespachar: preTransicao.verificarEntregadorAntesDespachar,
    onEntregadorAusenteAoDespachar: venda => setVendaIdAbrirEntregador(venda.id),
    confirmarPagamentoAntesFinalizar: preTransicao.confirmarPagamentoAntesFinalizar,
    revalidarPagamentoAntesFinalizar: preTransicao.revalidarPagamentoAntesFinalizar,
  })

  const reemitirNfePdv = useReemitirNfe()
  const reemitirNfeGestor = useReemitirNfeGestor()
  const emitirNotaPdv = useEmitirNfe()
  const emitirNotaGestor = useEmitirNfeGestor()
  const emitirNotaDelivery = useEmitirNfeDelivery()

  const { acaoFiscalEmAndamentoPorVenda, getEtapaKanbanParaExibicao: getEtapaKanbanFiscal, handleEmitirNfe } =
    useFiscalEmissaoKanban({
      reemitirNfePdv: payload => reemitirNfePdv.mutateAsync(payload),
      reemitirNfeGestor: payload => reemitirNfeGestor.mutateAsync(payload),
      emitirNotaPdv: payload => emitirNotaPdv.mutateAsync(payload),
      emitirNotaGestor: payload => emitirNotaGestor.mutateAsync(payload),
      emitirNotaDelivery: payload => emitirNotaDelivery.mutateAsync(payload),
      setPrimeiroPorColuna,
      setVendaSelecionadaParaEmissao: modais.setVendaSelecionadaParaEmissao,
      setSelectedVendaId: modais.setSelectedVendaId,
      setEmitirNfeModalOpen: modais.setEmitirNfeModalOpen,
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

  const dnd = useKanbanDragDrop({
    getEtapaKanbanParaExibicao,
    acaoFiscalEmAndamentoPorVenda,
    setPrimeiroPorColuna,
    moverEntregaPorDrag,
    finalizarEntregaPorDrag,
    handleEmitirNfe,
  })

  const etapaLocalEfetiva = useMemo(
    () => ({ ...etapaLocalPorVendaId, ...dnd.fiscalTransicaoUi }),
    [etapaLocalPorVendaId, dnd.fiscalTransicaoUi]
  )

  const getEtapaKanbanParaExibicaoComFiscal = useCallback(
    (venda: Venda) => {
      if (acaoFiscalEmAndamentoPorVenda[venda.id]) {
        return getEtapaKanbanFiscal(venda)
      }
      const etapaLocal = etapaLocalEfetiva[venda.id]
      if (etapaLocal) return etapaLocal
      return getEtapaKanbanFiscal(venda)
    },
    [acaoFiscalEmAndamentoPorVenda, etapaLocalEfetiva, getEtapaKanbanFiscal]
  )

  getEtapaKanbanParaExibicaoRef.current = getEtapaKanbanParaExibicaoComFiscal

  const entregador = useKanbanEntregadorSync({
    modoKanbanVendas,
    isLoadingDelivery: data.isLoadingDelivery,
    todasVendasCarregadas: data.todasVendasCarregadas,
    getEtapaKanbanParaExibicao: getEtapaKanbanParaExibicaoComFiscal,
    entregadorPorVendaIdRef,
  })

  patchEntregadorFnRef.current = entregador.patchEntregadorPorVendaId

  const colunas = useKanbanVendasPorColuna({
    isModoDeliveryKanban: data.isModoDeliveryKanban,
    todasVendasCarregadas: data.todasVendasCarregadas,
    deliveryKanban: data.deliveryKanban,
    balcaoKanban: data.balcaoKanban,
    deliveryColumnCounts: data.deliveryColumnCounts,
    getEtapaKanbanParaExibicao: getEtapaKanbanParaExibicaoComFiscal,
    etapaLocalPorVendaId: etapaLocalEfetiva,
    timestampsEtapaEntregaLocal,
    deltaContagemColunasTransicao,
    primeiroPorColuna,
    setPrimeiroPorColuna,
    vendasUnificadasQueryParams,
  })

  const reemissaoEmLote = useReemissaoFiscalEmLote({
    vendasRejeitadas: colunas.vendasPorColuna.REJEITADAS ?? [],
    acaoFiscalEmAndamentoPorVenda,
    fetchNextPage: data.fetchNextPage,
    hasNextPage: data.hasNextPage,
    refetchListagem: async () => {
      await data.refetchParaEmissaoFiscal()
    },
  })

  const handleClearFiltersComTerminal = useCallback(() => {
    handleClearFilters()
    data.setTerminalFilter('')
  }, [handleClearFilters, data.setTerminalFilter])

  const handleAtualizarListagem = useCallback(async () => {
    limparEstadoUiTransicao()
    setPrimeiroPorColuna({})
    await data.refetch()
  }, [limparEstadoUiTransicao, data.refetch, setPrimeiroPorColuna])

  const columns = useMemo(
    () => getVisibleKanbanColumns(modoKanbanVendas, colunaKanbanFiltro),
    [modoKanbanVendas, colunaKanbanFiltro]
  )

  const mostrarLoadingLista = data.isLoading && colunas.todasVendas.length === 0

  const handleCriterioOrdenacaoChange = useCallback(
    (columnId: ColunaKanbanId, criterio: CriterioOrdenacaoKanban) => {
      colunas.setCriterioOrdenacaoPorColuna(prev => ({
        ...prev,
        [columnId]: criterio,
      }))
      colunas.limparPinColuna(columnId)
    },
    [colunas]
  )

  const handleToggleDirecaoOrdenacao = useCallback(
    (columnId: ColunaKanbanId) => {
      colunas.setDirecaoOrdenacaoPorColuna(prev => ({
        ...prev,
        [columnId]: prev[columnId] === 'asc' ? 'desc' : 'asc',
      }))
      colunas.limparPinColuna(columnId)
    },
    [colunas]
  )

  const toolbarProps: KanbanToolbarProps = {
    searchInput,
    onSearchInputChange: setSearchInput,
    onRefresh: handleAtualizarListagem,
    filtrosVisiveisMobile,
    onToggleFiltrosMobile: () => setFiltrosVisiveisMobile(prev => !prev),
    origemFilter,
    onOrigemFilterChange: setOrigemFilter,
    tipoEntregaFilter,
    onTipoEntregaFilterChange: setTipoEntregaFilter,
    colunaKanbanFiltro,
    onColunaKanbanFiltroChange: setColunaKanbanFiltro,
    terminalFilter: data.terminalFilter,
    onTerminalFilterChange: data.setTerminalFilter,
    terminais: data.terminais,
    isLoadingTerminais: data.isLoadingTerminais,
    origemFilterDisabled: data.usaFiltroTerminal,
    periodoPreset,
    onPeriodoPresetChange: aplicarPeriodoPreset,
    periodoInicio: periodoInicioConsulta,
    periodoFim: periodoFimConsulta,
    onClearFilters: handleClearFiltersComTerminal,
    modoKanbanVendas,
    onModoKanbanVendasChange: setModoKanbanVendas,
    onAbrirConfiguracoesDelivery: modais.abrirConfigImpressoraExpedicao,
    onAbrirNovoPedido: modais.handleAbrirNovoPedido,
  }

  const boardProps: KanbanBoardRendererProps = {
    columns,
    mostrarLoadingLista,
    isModoDeliveryKanban: data.isModoDeliveryKanban,
    modoKanbanVendas,
    sensors: dnd.sensors,
    draggingVenda: dnd.draggingVenda,
    onDragStart: dnd.handleDragStart,
    onDragEnd: dnd.handleDragEnd,
    onDragCancel: dnd.handleDragCancel,
    vendasPorColuna: colunas.vendasPorColuna,
    getColumnTotalCount: colunas.getColumnTotalCount,
    criterioOrdenacaoPorColuna: colunas.criterioOrdenacaoPorColuna,
    direcaoOrdenacaoPorColuna: colunas.direcaoOrdenacaoPorColuna,
    onCriterioOrdenacaoChange: handleCriterioOrdenacaoChange,
    onToggleDirecaoOrdenacao: handleToggleDirecaoOrdenacao,
    onColumnScroll: data.handleColumnScroll,
    deliveryKanban: data.deliveryKanban,
    balcaoKanban: data.balcaoKanban,
    acaoFiscalEmAndamentoPorVenda,
    avancandoEtapaIds,
    timestampsEtapaEntregaLocal,
    onViewDetails: modais.handleViewDetails,
    onEditarProdutos:
      modoKanbanVendas === 'delivery' ? modais.handleEditarProdutos : undefined,
    onAvancarEtapa: (vendaAtual, colunaAtual) =>
      void handleAvancarEtapa(vendaAtual, colunaAtual),
    onEmitirNfe: vendaAtual => void handleEmitirNfe(vendaAtual),
    onReimprimirCupomDelivery:
      modoKanbanVendas === 'delivery'
        ? (vendaAtual, colunaAtual) =>
            void preTransicao.reimprimirCupomEntrega(vendaAtual, colunaAtual)
        : undefined,
    entregadorPorVendaId: entregador.entregadorPorVendaId,
    vendaIdAbrirEntregador,
    onAbrirEntregadorConsumido: () => setVendaIdAbrirEntregador(null),
    onEntregadorAtualizado: entregador.handleEntregadorAtualizado,
    onConfirmarCobranca:
      modoKanbanVendas === 'delivery'
        ? vendaAtual => modais.abrirDetalhesPagamentoPedido(vendaAtual)
        : undefined,
    nomesMeiosPagamento: data.nomesMeiosPagamentoKanban,
    reemissaoEmLote: data.isModoDeliveryKanban ? undefined : reemissaoEmLote,
  }

  const modaisProps: KanbanModaisRendererProps = {
    timezoneAgregacao,
    modalPeriodoDatasAberto,
    onCloseModalPeriodoDatas: () => setModalPeriodoDatasAberto(false),
    rascunhoPeriodoRange,
    onRascunhoPeriodoRangeChange: handleRascunhoPeriodoRangeChange,
    mesCalendarioPeriodo,
    onMesCalendarioPeriodoChange: setMesCalendarioPeriodo,
    rascunhoHoraPeriodoInicio,
    rascunhoHoraPeriodoFim,
    onHorariosPeriodoChange: (hi, hf) => {
      setRascunhoHoraPeriodoInicio(hi)
      setRascunhoHoraPeriodoFim(hf)
    },
    onAplicarPeriodoDatas: aplicarPeriodoDatas,
    deliveryConfiguracoesOpen: modais.deliveryConfiguracoesOpen,
    onCloseDeliveryConfiguracoes: () => modais.setDeliveryConfiguracoesOpen(false),
    vendaSelecionadaParaEmissao: modais.vendaSelecionadaParaEmissao,
    emitirNfeModalOpen: modais.emitirNfeModalOpen,
    onCloseEmitirNfe: () => {
      modais.setEmitirNfeModalOpen(false)
      modais.setSelectedVendaId(null)
      modais.setVendaSelecionadaParaEmissao(null)
    },
    onClienteSalvoEmitirNfe: () => void data.refetch(),
    novoPedidoCriarContext: modais.novoPedidoCriarContext,
    novoPedidoModalOpen: modais.novoPedidoModalOpen,
    onCloseNovoPedidoCriar: () => modais.setNovoPedidoModalOpen(false),
    onAfterCloseNovoPedidoCriar: () => modais.setNovoPedidoCriarContext(null),
    onSuccessNovoPedidoCriar: () => {
      modais.setNovoPedidoModalOpen(false)
      void data.refetch()
    },
    pedidoEdicaoProdutosContext: modais.pedidoEdicaoProdutosContext,
    novoPedidoModalEdicaoProdutosOpen: modais.novoPedidoModalEdicaoProdutosOpen,
    onCloseEdicaoProdutos: () => modais.setNovoPedidoModalEdicaoProdutosOpen(false),
    onAfterCloseEdicaoProdutos: () => modais.setPedidoEdicaoProdutosContext(null),
    onSuccessEdicaoProdutos: () => {
      modais.setNovoPedidoModalEdicaoProdutosOpen(false)
      if (modais.pedidoEdicaoProdutosContext) {
        void invalidateVendaDetalheCarregadaCache(
          queryClient,
          empresaId,
          modais.pedidoEdicaoProdutosContext.id
        )
      }
      void data.refetch()
    },
    pedidoVisualizacaoContext: modais.pedidoVisualizacaoContext,
    novoPedidoModalVisualizacaoOpen: modais.novoPedidoModalVisualizacaoOpen,
    onCloseVisualizacao: () => modais.setNovoPedidoModalVisualizacaoOpen(false),
    onAfterCloseVisualizacao: () => modais.setPedidoVisualizacaoContext(null),
    onSuccessVisualizacao: () => {
      modais.setNovoPedidoModalVisualizacaoOpen(false)
      void data.refetch()
    },
    modoKanbanVendas,
  }

  return { toolbarProps, boardProps, modaisProps }
}
