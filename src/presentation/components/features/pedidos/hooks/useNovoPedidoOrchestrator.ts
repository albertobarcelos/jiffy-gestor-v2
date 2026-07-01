'use client'

import { useMemo, useRef, useCallback } from 'react'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'
import {
  useCreatePedidoDelivery,
  useCreateVendaGestor,
  useCancelarVendaGestor,
  useCancelarNotaFiscalVendaPdv,
  useCancelarNotaFiscalVendaGestor,
} from '@/src/presentation/hooks/useVendas'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useImpressaoDelivery } from '@/features/delivery/hooks/useImpressaoDelivery'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import type { NovoPedidoModalProps } from '../types'
import {
  calcularTotalProduto,
  formatarDescontoAcrescimo,
  formatarNumeroComMilhar,
  formatarValorComplemento,
  obterTotalComplemento,
} from '@/src/domain/services/pedido/CalculadoraPedido'
import type { CanalVendaNovoPedido } from '../novoPedidoProdutosApi'
import { useNovoPedidoCatalogoData } from './data/useNovoPedidoCatalogoData'
import { useCarregarVenda } from './data/useCarregarVenda'
import { useEntregadoresQuery } from './data/useEntregadoresQuery'
import { useTaxasEntregaQuery } from './data/useTaxasEntregaQuery'
import { useNovoPedidoDelivery } from './useNovoPedidoDelivery'
import { useNovoPedidoPagamentos } from './useNovoPedidoPagamentos'
import {
  useNovoPedidoResetOnExit,
  useNovoPedidoSubmit,
  useNovoPedidoSubmitGuard,
} from './useNovoPedidoSubmit'
import { useHorizontalDragScroll } from './useHorizontalDragScroll'
import { useNovoPedidoProdutos } from './form/useNovoPedidoProdutos'
import { useNovoPedidoPagamentosForm } from './form/useNovoPedidoPagamentosForm'
import { useNovoPedidoCliente } from './form/useNovoPedidoCliente'
import { useNovoPedidoEdicaoLinha } from './form/useNovoPedidoEdicaoLinha'
import { useNovoPedidoNavegacao } from './form/useNovoPedidoNavegacao'
import { useNovoPedidoFormState } from './orchestrator/useNovoPedidoFormState'
import { useEdicaoProdutosDelivery } from './orchestrator/useEdicaoProdutosDelivery'
import { useNovoPedidoGestorActions } from './orchestrator/useNovoPedidoGestorActions'
import { useNovoPedidoOrchestratorEffects } from './orchestrator/useNovoPedidoOrchestratorEffects'
import { createNovoPedidoResetForm } from './orchestrator/createNovoPedidoResetForm'
import { assembleNovoPedidoContextSlices } from './orchestrator/assembleNovoPedidoContextSlices'
import { canSubmitNovoPedido } from './orchestrator/canSubmitNovoPedido'
import { useNovoPedidoOrchestratorFlags } from './orchestrator/useNovoPedidoOrchestratorFlags'
import {
  formatarDataDetalhePedido as formatarDataDetalhePedidoOrchestrator,
  formatarDataHoraResumoFiscal,
  formatarUsuarioPorId as formatarUsuarioPorIdOrchestrator,
  rotuloModeloNfe as rotuloModeloNfeOrchestrator,
} from '@/src/application/mappers/PedidoDisplayMapper'

export type { NovoPedidoShellProps } from './orchestrator/types'
import type { NovoPedidoShellProps } from './orchestrator/types'

export function useNovoPedidoOrchestrator({
  open,
  onClose,
  onSuccess,
  onAfterClose,
  vendaId,
  modoVisualizacao,
  modoEdicaoProdutos = false,
  tabelaOrigemVenda = 'venda_gestor',
  statusFiscalUnificado = null,
  tipoVendaGestor = null,
  tipoInicioPedido = 'balcao',
  abaDetalhesInicial,
}: NovoPedidoModalProps) {
  const { auth } = useAuthStore()
  const { empresa, preferenciasImpressaoDelivery } = useEmpresaMe()
  const { processarAposTransicaoVendaGestorId } = useImpressaoDelivery()
  const empresaId = useTenantEmpresaId()
  const createVendaGestor = useCreateVendaGestor()
  const createPedidoDelivery = useCreatePedidoDelivery()
  const createSubmitPending =
    createVendaGestor.isPending || createPedidoDelivery.isPending
  const { iniciarSubmit, finalizarSubmit } = useNovoPedidoSubmitGuard(createSubmitPending)
  const cancelarVendaGestor = useCancelarVendaGestor()
  const cancelarNotaFiscalVendaPdv = useCancelarNotaFiscalVendaPdv()
  const cancelarNotaFiscalVendaGestor = useCancelarNotaFiscalVendaGestor()

  const form = useNovoPedidoFormState(tipoInicioPedido)
  const {
    origem,
    setOrigem,
    status,
    setStatus,
    clienteId,
    setClienteId,
    clienteNome,
    setClienteNome,
    produtos,
    setProdutos,
    observacaoPedido,
    setObservacaoPedido,
    catalogoProdutosPorId,
    setCatalogoProdutosPorId,
    pagamentos,
    setPagamentos,
    meioPagamentoId,
    setMeioPagamentoId,
    valorRecebido,
    setValorRecebido,
    fluxoPagamentoEntrega,
    setFluxoPagamentoEntrega,
    tipoAtendimentoDelivery,
    setTipoAtendimentoDelivery,
    grupoSelecionadoId,
    setGrupoSelecionadoId,
    buscaProdutoTexto,
    setBuscaProdutoTexto,
    seletorClienteOpen,
    setSeletorClienteOpen,
    tooltipGrupoId,
    setTooltipGrupoId,
    tooltipPosition,
    setTooltipPosition,
    currentStep,
    setCurrentStep,
    moradaEntregaSelecionada,
    setMoradaEntregaSelecionada,
    telefoneBuscaEntrega,
    setTelefoneBuscaEntrega,
    telefoneBuscadoEntrega,
    setTelefoneBuscadoEntrega,
    tempoPrevistoMinutos,
    setTempoPrevistoMinutos,
    taxaEntregaId,
    setTaxaEntregaId,
    clienteEntregaVinculado,
    setClienteEntregaVinculado,
    nomeUsuario,
    setNomeUsuario,
    isSavingPagamentoEntrega,
    setIsSavingPagamentoEntrega,
    dataVenda,
    setDataVenda,
    valorFinalVenda,
    setValorFinalVenda,
    dataFinalizacaoCarregada,
    setDataFinalizacaoCarregada,
    vendaGestorJaCancelada,
    setVendaGestorJaCancelada,
    modalCancelarVendaOpen,
    setModalCancelarVendaOpen,
    tipoCancelamentoSelecionado,
    setTipoCancelamentoSelecionado,
    justificativaCancelamento,
    setJustificativaCancelamento,
    produtoTabsModalState,
    setProdutoTabsModalState,
    abaDetalhesPedido,
    setAbaDetalhesPedido,
    detalhesPedidoMeta,
    setDetalhesPedidoMeta,
    detalhesEntregaPedido,
    setDetalhesEntregaPedido,
    nomesUsuariosPedido,
    setNomesUsuariosPedido,
    nomesMeiosPagamentoPedido,
    setNomesMeiosPagamentoPedido,
    resumoFinanceiroDetalhes,
    setResumoFinanceiroDetalhes,
    resumoFiscal,
    setResumoFiscal,
    statusFiscalDetalhe,
    setStatusFiscalDetalhe,
    vendaIdCriada,
    setVendaIdCriada,
  } = form

  const tipoVendaHint = tipoVendaGestor ?? detalhesPedidoMeta?.tipoVenda ?? null

  const { pedidoDeliveryGestor, pedidoComEntrega, pedidoComRetirada } = useNovoPedidoDelivery({
    tipoInicioPedido,
    tipoAtendimentoDelivery,
    tabelaOrigemVenda,
    tipoVendaHint,
  })
  const pedidoBalcao = tipoInicioPedido !== 'entrega'
  const canalVendaNovoPedido: CanalVendaNovoPedido =
    tipoInicioPedido === 'entrega' ? 'entrega' : 'balcao'
  /** Balcão e delivery: passo de produtos é sempre o step 1 na criação. */
  const estaNoPassoProdutos = open && !modoVisualizacao && currentStep === 1

  const {
    scrollRef: gruposScrollRef,
    isDragging,
    hasMovedRef,
    handleMouseDown,
    handleWheel: handleGruposWheel,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  } = useHorizontalDragScroll<HTMLDivElement>()
  const {
    scrollRef: meiosPagamentoScrollRef,
    isDragging: isDraggingMeiosPagamento,
    hasMovedRef: hasMovedMeiosPagamentoRef,
    handleMouseDown: handleMouseDownMeiosPagamento,
  } = useHorizontalDragScroll<HTMLDivElement>()
  const token = auth?.getAccessToken()

  const {
    grupos,
    isLoadingGruposVenda,
    produtosList,
    buscaProdutoFiltrada,
    isLoadingProdutosVenda,
    isLoadingBuscaProdutos,
    isLoadingProdutos,
    produtosError,
    carregarProdutoNoCatalogoSeNecessario,
  } = useNovoPedidoCatalogoData({
    estaNoPassoProdutos,
    token,
    empresaId: empresaId ?? undefined,
    canal: canalVendaNovoPedido,
    grupoSelecionadoId,
    setGrupoSelecionadoId,
    buscaProdutoTexto,
    catalogoProdutosPorId,
    setCatalogoProdutosPorId,
  })

  const {
    valoresEmEdicao,
    setValoresEmEdicao,
    modalLancamentoProdutoPainelOpen,
    setModalLancamentoProdutoPainelOpen,
    produtoParaLancamentoPainel,
    setProdutoParaLancamentoPainel,
    indiceLinhaPainelProduto,
    setIndiceLinhaPainelProduto,
    painelLinhaModo,
    setPainelLinhaModo,
    longPressTimeoutRef,
    longPressIndexRef,
    longPressComplementoTimeoutRef,
    longPressComplementoIndexRef,
    produtoTemComplementos,
    carregandoComplementosPainel,
    complementoTabsModalPainelState,
    abrirEdicaoComplementoNoPainel,
    fecharComplementoTabsModalNoPainel,
    handleTabChangeComplementoTabsModalPainel,
    recarregarProdutoPainelAposEdicaoComplemento,
    recarregarProdutoCarrinhoAposEdicao,
    adicionarProduto,
    confirmarLancamentoProdutoPainel,
    abrirModalComplementosProdutoExistente,
    abrirModalObservacaoProduto,
    removerProduto,
    atualizarProduto,
    atualizarComplemento,
    removerComplemento,
    limparLongPressTimeouts,
  } = useNovoPedidoProdutos({
    produtos,
    setProdutos,
    catalogoProdutosPorId,
    setCatalogoProdutosPorId,
    produtosList,
    carregarProdutoNoCatalogoSeNecessario,
  })

  const {
    modalEdicaoProdutoOpen,
    setModalEdicaoProdutoOpen,
    produtoIndexEdicao,
    setProdutoIndexEdicao,
    quantidadeEdicao,
    setQuantidadeEdicao,
    unidadeMedidaEdicao,
    setUnidadeMedidaEdicao,
    ehAcrescimo,
    setEhAcrescimo,
    ehPorcentagem,
    setEhPorcentagem,
    valorDescontoAcrescimo,
    setValorDescontoAcrescimo,
    valorUnitarioEdicaoPainel,
    setValorUnitarioEdicaoPainel,
    abrirModalEdicaoProduto,
    confirmarEdicaoProduto,
    resetEdicaoLinha,
  } = useNovoPedidoEdicaoLinha({
    produtos,
    setProdutos,
    catalogoProdutosPorId,
    produtosList,
    carregarProdutoNoCatalogoSeNecessario,
  })

  const {
    clienteTabsModalEntregaState,
    setClienteTabsModalEntregaState,
    handleSelectCliente,
    handleRemoveCliente,
    handleTipoAtendimentoDeliveryChange,
    handleAbrirEdicaoClienteEntrega,
    handleFecharClienteTabsModalEntrega,
    handleTabChangeClienteTabsModalEntrega,
    handleReloadClienteEntregaAposEdicao,
  } = useNovoPedidoCliente({
    tipoInicioPedido,
    clienteEntregaVinculado,
    setClienteEntregaVinculado,
    setClienteId,
    setClienteNome,
    setTelefoneBuscaEntrega,
    setTelefoneBuscadoEntrega,
    setMoradaEntregaSelecionada,
    setTaxaEntregaId,
    setTipoAtendimentoDelivery,
    getAccessToken: () => auth?.getAccessToken(),
  })

  // Buscar meios de pagamento
  const {
    data: meiosPagamentoData,
    isPending: isPendingMeiosPagamento,
    isFetching: isFetchingMeiosPagamento,
  } = useMeiosPagamentoInfinite({
    limit: 100,
    ativo: true,
    // Step 3 usa meios de pagamento; em visualizacao/edicao pode ser usado para resolver nomes.
    enabled: open && (currentStep >= 3 || modoVisualizacao || !!vendaId),
    refetchOnWindowFocus: false,
  })

  const meiosPagamento = useMemo(() => {
    if (!meiosPagamentoData?.pages) return []
    return meiosPagamentoData.pages.flatMap(page => page.meiosPagamento || [])
  }, [meiosPagamentoData])

  const { entregadores, entregadoresQuery } = useEntregadoresQuery({
    enabled: open && (pedidoComEntrega || Boolean(modoVisualizacao)),
    token,
  })

  const { taxasEntrega, taxasEntregaQuery } = useTaxasEntregaQuery({
    open,
    modoVisualizacao: Boolean(modoVisualizacao),
    pedidoComEntrega,
  })

  const flags = useNovoPedidoOrchestratorFlags({
    modoVisualizacao,
    tabelaOrigemVenda,
    statusFiscalUnificado,
    resumoFiscal,
    statusFiscalDetalhe,
    origem,
    detalhesPedidoMeta,
    tipoInicioPedido,
    status,
    fluxoPagamentoEntrega,
    currentStep,
    dataFinalizacaoCarregada,
    vendaId,
    vendaGestorJaCancelada,
    pedidoComRetirada,
    pedidoComEntrega,
    valorFinalVenda,
    produtos,
    pagamentos,
    taxaEntregaId,
    taxasEntrega,
    resumoFinanceiroDetalhes,
    detalhesEntregaPedido,
  })

  const {
    podeExibirAbaNotaFiscal,
    podeExibirAbaDadosEntrega,
    statusDisponiveis,
    rotuloStatusResumoModal,
    pedidoGestorComPagamentoNoPasso3,
    pedidoEntregaAceitaPagamentoPendente,
    entregaComCobrancaPeloEntregador,
    pagamentoModoCobranca,
    rotuloCobrancaPendente,
    subtotalProdutos,
    taxaEntregaSelecionada,
    valorTaxaEntrega,
    totalProdutos,
    totalItensPedido,
    podeExibirCancelarVendaGestor,
    podeExibirCancelarNotaFiscal,
    podeEditarPagamentoEntregaEmAberto,
    podeAjustarPagamentoEntregaEmAberto,
    pagamentoEntregaConfirmado,
  } = flags

  /** Primeira carga ou fetch sem cache ainda — evita área vazia sem feedback */
  const mostrarLoadingFormasPagamento =
    isPendingMeiosPagamento || (isFetchingMeiosPagamento && meiosPagamentoData === undefined)

  // Refs estáveis: evitam que `carregarVendaExistente` mude quando queries atualizam ao focar a aba
  const meiosPagamentoRef = useRef(meiosPagamento)
  meiosPagamentoRef.current = meiosPagamento
  const authRef = useRef(auth)
  authRef.current = auth

  const tipoVendaParaDetalhe =
    tipoVendaGestor ??
    (tipoInicioPedido === 'entrega' ? 'entrega' : null)

  const { carregarVendaExistente, isLoadingVenda, setIsLoadingVenda, vendaDataUpdatedAt } =
    useCarregarVenda({
    open,
    vendaId,
    vendaIdCriada,
    modoVisualizacao,
    tabelaOrigemVenda,
    tipoVendaGestor: tipoVendaParaDetalhe,
    meiosPagamentoRef,
    getToken: () => authRef.current?.getAccessToken(),
    onClose,
    handlers: {
      setDetalhesPedidoMeta,
      setResumoFiscal,
      setStatusFiscalDetalhe,
      setOrigem,
      setStatus,
      setClienteId,
      setClienteNome,
      setDetalhesEntregaPedido,
      setDataVenda,
      setValorFinalVenda,
      setDataFinalizacaoCarregada,
      setVendaGestorJaCancelada,
      setProdutos,
      setResumoFinanceiroDetalhes,
      setPagamentos,
      setFluxoPagamentoEntrega,
      setNomesUsuariosPedido,
      setNomesMeiosPagamentoPedido,
      setObservacaoPedido,
      setCurrentStep,
    },
  })

  const {
    totalPagamentos,
    totalPagamentosLancados,
    valorAPagar,
    valorAPagarLancamento,
    statusPagamentoPedido,
    statusPagamentoExibicao,
    rotuloStatusPagamentoExibicao,
    troco,
    trocoLancamento,
    pagamentosVisiveisNaAbaDetalhes,
  } = useNovoPedidoPagamentos({
    pagamentos,
    totalProdutos,
    pagamentoModoCobranca,
    meiosPagamento,
  })

  const {
    obterIconeMeioPagamento,
    formatarValorRecebido,
    adicionarPagamentoPorCard,
    adicionarPagamento,
    removerPagamento,
  } = useNovoPedidoPagamentosForm({
    pagamentos,
    setPagamentos,
    meioPagamentoId,
    setMeioPagamentoId,
    valorRecebido,
    setValorRecebido,
    meiosPagamento,
    pagamentoModoCobranca,
    valorAPagar,
    valorAPagarLancamento,
    totalProdutos,
    totalPagamentos,
    entregaComCobrancaPeloEntregador,
  })

  const {
    modalConfirmacaoSaidaOpen,
    setModalConfirmacaoSaidaOpen,
    internalDialogOpen,
    setInternalDialogOpen,
    handleClose,
    handleConfirmarSaida,
    handleCancelarSaida,
    handleNextStep,
    handlePreviousStep,
    handleDialogOpenChange,
    validarInformacoesPedido,
  } = useNovoPedidoNavegacao({
    open,
    onClose,
    vendaId,
    modoVisualizacao,
    tipoInicioPedido,
    produtos,
    pagamentos,
    clienteId,
    currentStep,
    setCurrentStep,
    pedidoDeliveryGestor,
    clienteEntregaVinculadoId: clienteEntregaVinculado?.id,
    pedidoComEntrega,
    temEnderecoEntrega: Boolean(moradaEntregaSelecionada?.endereco),
    modoEdicaoProdutos,
  })

  const { salvandoProdutos, handleSalvarProdutos } = useEdicaoProdutosDelivery({
    ativo: modoEdicaoProdutos,
    vendaId,
    getToken: () => authRef.current?.getAccessToken(),
    produtos,
    observacaoPedido,
    vendaDataUpdatedAt,
    onSuccess,
    onClose,
    setInternalDialogOpen,
  })

  const { handleSubmit } = useNovoPedidoSubmit({
    isPending: createSubmitPending,
    iniciarSubmit,
    finalizarSubmit,
    input: {
      tipoInicioPedido,
      origem,
      status,
      produtos,
      pagamentos,
      observacaoPedido,
      totalProdutos,
      totalPagamentos,
      totalPagamentosLancados,
      clienteId,
      clienteEntregaVinculado,
      tipoAtendimentoDelivery,
      tempoPrevistoMinutos,
      pedidoComEntrega,
      taxaEntregaSelecionada,
      valorTaxaEntrega,
      moradaEntregaSelecionada,
      entregaComCobrancaPeloEntregador,
      valorRecebido,
      trocoLancamento,
      statusPagamentoPedido,
      valorAPagar,
      meiosPagamento,
      nomesMeiosPagamentoPedido,
      telefoneCliente: telefoneBuscadoEntrega ?? undefined,
    },
    validacao: {
      pedidoDeliveryGestor,
      pedidoGestorComPagamentoNoPasso3,
      pedidoEntregaAceitaPagamentoPendente,
      entregaComCobrancaPeloEntregador,
      pedidoComRetirada,
      pedidoComEntrega,
      temEnderecoEntrega: Boolean(moradaEntregaSelecionada?.endereco),
      troco,
    },
    createVendaGestor,
    createPedidoDelivery,
    onSuccess,
    onClose,
    setInternalDialogOpen,
    setCurrentStep,
    setVendaIdCriada,
    status,
    tipoInicioPedido,
    processarAposTransicaoVendaGestorId,
    preferenciasAutoIniciarPreparo: preferenciasImpressaoDelivery.autoIniciarPreparoNovosPedidos,
    accessToken: auth?.getAccessToken(),
  })

  const formatarDataDetalhePedido = useCallback(
    (valor: string | null | undefined) => formatarDataDetalhePedidoOrchestrator(valor),
    []
  )

  const formatarUsuarioPorId = useCallback(
    (usuarioId: string | null | undefined) =>
      formatarUsuarioPorIdOrchestrator(usuarioId, nomesUsuariosPedido),
    [nomesUsuariosPedido]
  )

  const rotuloModeloNfe = rotuloModeloNfeOrchestrator

  const gestorActions = useNovoPedidoGestorActions({
    vendaId,
    tabelaOrigemVenda,
    onSuccess,
    onClose,
    auth,
    cancelarVendaGestor,
    cancelarNotaFiscalVendaPdv,
    cancelarNotaFiscalVendaGestor,
    form,
    setInternalDialogOpen,
    totalProdutos,
    totalPagamentosLancados,
    trocoLancamento,
    usarModuloDeliveryCobrancas: pedidoDeliveryGestor,
    recarregarVendaExistente: carregarVendaExistente,
    confirmarPagamentoParaFinalizar:
      Boolean(modoVisualizacao) && abaDetalhesInicial === 'pagamentos',
  })

  const {
    handleSalvarPagamentoEntregaEmAberto,
    handleAbrirEdicaoProdutoDetalhes,
    handleFecharProdutoTabsModal,
    handleTabChangeProdutoModal,
    handleConfirmarCancelamentoVenda,
    atualizarPagamento,
  } = gestorActions

  useNovoPedidoOrchestratorEffects({
    open,
    vendaId,
    modoVisualizacao,
    tipoInicioPedido,
    abaDetalhesInicial,
    vendaDataUpdatedAt,
    auth,
    currentStep,
    abaDetalhesPedido,
    podeExibirAbaNotaFiscal,
    podeExibirAbaDadosEntrega,
    setCurrentStep,
    setAbaDetalhesPedido,
    setStatus,
    setFluxoPagamentoEntrega,
    setNomeUsuario,
    longPressTimeoutRef,
    longPressComplementoTimeoutRef,
  })

  const resetForm = createNovoPedidoResetForm({
    tipoInicioPedido,
    form,
    limparLongPressTimeouts,
    resetEdicaoLinha,
    setClienteTabsModalEntregaState,
    setModalLancamentoProdutoPainelOpen,
    setProdutoParaLancamentoPainel,
    setIndiceLinhaPainelProduto,
    setPainelLinhaModo,
    setModalEdicaoProdutoOpen,
    setProdutoIndexEdicao,
    setQuantidadeEdicao,
    setEhAcrescimo,
    setEhPorcentagem,
    setValorDescontoAcrescimo,
    setValorUnitarioEdicaoPainel,
    setModalConfirmacaoSaidaOpen,
    setIsLoadingVenda,
  })

  const handlePedidoPainelExited = useNovoPedidoResetOnExit(resetForm, onAfterClose)

  const temEnderecoEntrega = Boolean(moradaEntregaSelecionada?.endereco)

  const canSubmit = () =>
    canSubmitNovoPedido({
      pedidoDeliveryGestor,
      clienteEntregaVinculadoId: clienteEntregaVinculado?.id,
      pedidoComEntrega,
      temEnderecoEntrega,
      pedidoEntregaAceitaPagamentoPendente,
      entregaComCobrancaPeloEntregador,
      produtosCount: produtos.length,
      produtos,
      pagamentos,
      totalProdutos,
      totalPagamentos,
      troco,
      pedidoGestorComPagamentoNoPasso3,
      pedidoComRetirada,
      status,
    })

  const novoPedidoContextValue = assembleNovoPedidoContextSlices({
    abaDetalhesPedido,
    adicionarPagamentoPorCard,
    adicionarProduto,
    abrirModalComplementosProdutoExistente,
    abrirModalEdicaoProduto,
    abrirModalObservacaoProduto,
    atualizarComplemento,
    atualizarProduto,
    buscaProdutoFiltrada,
    buscaProdutoTexto,
    calcularTotalProduto,
    cancelarNotaFiscalVendaGestor,
    cancelarNotaFiscalVendaPdv,
    cancelarVendaGestor,
    catalogoProdutosPorId,
    clienteTabsModalEntregaState,
    clienteEntregaVinculado,
    clienteNome,
    confirmarEdicaoProduto,
    confirmarLancamentoProdutoPainel,
    currentStep,
    dataVenda,
    detalhesPedidoMeta,
    detalhesEntregaPedido,
    ehAcrescimo,
    ehPorcentagem,
    empresa,
    entregadores,
    entregadoresQuery,
    fluxoPagamentoEntrega,
    formatarDataDetalhePedido,
    formatarDataHoraResumoFiscal,
    formatarDescontoAcrescimo,
    formatarNumeroComMilhar,
    formatarUsuarioPorId,
    formatarValorComplemento,
    formatarValorRecebido,
    grupoSelecionadoId,
    grupos,
    gruposScrollRef,
    handleAbrirEdicaoClienteEntrega,
    handleAbrirEdicaoProdutoDetalhes,
    handleCancelarSaida,
    handleFecharClienteTabsModalEntrega,
    handleFecharProdutoTabsModal,
    handleClose,
    handleConfirmarCancelamentoVenda,
    handleConfirmarSaida,
    handleMouseDown,
    handleGruposWheel,
    handleMouseDownMeiosPagamento,
    handleMouseLeave,
    handleMouseMove,
    handleMouseUp,
    handleRemoveCliente,
    handleReloadClienteEntregaAposEdicao,
    handleSelectCliente,
    handleTabChangeClienteTabsModalEntrega,
    handleTabChangeProdutoModal,
    handleTipoAtendimentoDeliveryChange,
    hasMovedMeiosPagamentoRef,
    hasMovedRef,
    isDragging,
    isDraggingMeiosPagamento,
    isLoadingVenda,
    isLoadingGruposVenda,
    isLoadingProdutosVenda,
    isLoadingBuscaProdutos,
    isLoadingProdutos,
    indiceLinhaPainelProduto,
    justificativaCancelamento,
    longPressComplementoIndexRef,
    longPressComplementoTimeoutRef,
    longPressIndexRef,
    longPressTimeoutRef,
    meioPagamentoId,
    meiosPagamento,
    meiosPagamentoScrollRef,
    moradaEntregaSelecionada,
    mostrarLoadingFormasPagamento,
    modoVisualizacao,
    modalCancelarVendaOpen,
    modalConfirmacaoSaidaOpen,
    modalEdicaoProdutoOpen,
    modalLancamentoProdutoPainelOpen,
    nomesMeiosPagamentoPedido,
    obterIconeMeioPagamento,
    obterTotalComplemento,
    observacaoPedido,
    setObservacaoPedido,
    origem,
    statusFiscalDetalhe,
    pagamentoModoCobranca,
    painelLinhaModo,
    pagamentos,
    pagamentosVisiveisNaAbaDetalhes,
    podeEditarPagamentoEntregaEmAberto,
    podeAjustarPagamentoEntregaEmAberto,
    pagamentoEntregaConfirmado,
    podeExibirAbaDadosEntrega,
    podeExibirAbaNotaFiscal,
    pedidoComEntrega,
    pedidoComRetirada,
    pedidoDeliveryGestor,
    pedidoEntregaAceitaPagamentoPendente,
    pedidoGestorComPagamentoNoPasso3,
    produtoIndexEdicao,
    produtoParaLancamentoPainel,
    produtoTabsModalState,
    produtoTemComplementos,
    carregandoComplementosPainel,
    complementoTabsModalPainelState,
    abrirEdicaoComplementoNoPainel,
    fecharComplementoTabsModalNoPainel,
    handleTabChangeComplementoTabsModalPainel,
    recarregarProdutoPainelAposEdicaoComplemento,
    recarregarProdutoCarrinhoAposEdicao,
    produtos,
    produtosError,
    produtosList,
    removerComplemento,
    removerPagamento,
    removerProduto,
    resumoFinanceiroDetalhes,
    resumoFiscal,
    rotuloModeloNfe,
    rotuloCobrancaPendente,
    rotuloStatusPagamentoExibicao,
    rotuloStatusResumoModal,
    setBuscaProdutoTexto,
    setClienteEntregaVinculado,
    setEhAcrescimo,
    setEhPorcentagem,
    setFluxoPagamentoEntrega,
    setGrupoSelecionadoId,
    setMeioPagamentoId,
    setIndiceLinhaPainelProduto,
    setJustificativaCancelamento,
    setModalCancelarVendaOpen,
    setModalConfirmacaoSaidaOpen,
    setModalEdicaoProdutoOpen,
    setModalLancamentoProdutoPainelOpen,
    setMoradaEntregaSelecionada,
    setPagamentos,
    setProdutoIndexEdicao,
    setProdutoParaLancamentoPainel,
    setQuantidadeEdicao,
    setUnidadeMedidaEdicao,
    setOrigem,
    setSeletorClienteOpen,
    setStatus,
    setTaxaEntregaId,
    setTelefoneBuscadoEntrega,
    setTelefoneBuscaEntrega,
    setTempoPrevistoMinutos,
    setTooltipGrupoId,
    setTooltipPosition,
    setTipoCancelamentoSelecionado,
    setPainelLinhaModo,
    setValoresEmEdicao,
    setValorDescontoAcrescimo,
    setValorFinalVenda,
    setValorRecebido,
    setValorUnitarioEdicaoPainel,
    status,
    statusFiscalUnificado,
    statusDisponiveis,
    statusPagamentoExibicao,
    tabelaOrigemVenda,
    subtotalProdutos,
    taxaEntregaId,
    taxaEntregaSelecionada,
    taxasEntrega,
    taxasEntregaQuery,
    telefoneBuscadoEntrega,
    telefoneBuscaEntrega,
    tempoPrevistoMinutos,
    tipoCancelamentoSelecionado,
    tipoInicioPedido,
    tooltipGrupoId,
    tooltipPosition,
    totalItensPedido,
    totalPagamentos,
    totalPagamentosLancados,
    totalProdutos,
    trocoLancamento,
    valorAPagarLancamento,
    valorAPagar,
    valorDescontoAcrescimo,
    valorFinalVenda,
    valorRecebido,
    valorTaxaEntrega,
    valorUnitarioEdicaoPainel,
    valoresEmEdicao,
    quantidadeEdicao,
    unidadeMedidaEdicao,
    seletorClienteOpen,
  })

  const shell: NovoPedidoShellProps = {
    internalDialogOpen,
    handleDialogOpenChange,
    handlePedidoPainelExited,
    estaNoPassoProdutos,
    modoVisualizacao,
    modoEdicaoProdutos,
    salvandoProdutos,
    onSalvarProdutos: handleSalvarProdutos,
    nomeUsuario,
    currentStep,
    isLoadingVenda,
    abaDetalhesPedido,
    setAbaDetalhesPedido,
    podeExibirAbaNotaFiscal,
    podeExibirAbaDadosEntrega,
    tipoInicioPedido,
    createPending: createSubmitPending,
    canSubmit,
    onSubmit: handleSubmit,
    onNextStep: handleNextStep,
    onPreviousStep: handlePreviousStep,
    onClose,
    onSuccess,
    podeExibirCancelarVendaGestor,
    podeExibirCancelarNotaFiscal,
    isSavingPagamentoEntrega,
    onSalvarPagamentoEntrega: handleSalvarPagamentoEntregaEmAberto,
  }

  return { contextValue: novoPedidoContextValue, shell }
}
