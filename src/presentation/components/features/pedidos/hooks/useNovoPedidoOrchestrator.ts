'use client'

import { useMemo, useRef, useCallback, useEffect, useState } from 'react'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'
import { ordenarMeiosPagamentoPadrao } from '@/src/shared/utils/corFormaPagamentoFiscal'
import {
  useCreatePedidoDelivery,
  useCreateVendaGestor,
  useCancelarVendaGestor,
  useCancelarNotaFiscalVendaPdv,
  useCancelarNotaFiscalVendaGestor,
  useTransicaoPedidoDelivery,
} from '@/src/presentation/hooks/useVendas'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useMenuDeliveryId } from '@/src/presentation/hooks/useMenuDeliveryId'
import { usePreferenciasImpressaoDelivery } from '@/src/presentation/hooks/usePreferenciasImpressaoDelivery'
import { useImpressaoDelivery } from '@/features/delivery/hooks/useImpressaoDelivery'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateKanbanVendasListagens } from '@/features/kanban/hooks/kanbanListagemQueryCache'
import { invalidateVendaDetalheCarregadaCache } from './data/useVendaDetalheCarregadaQuery'
import type { NovoPedidoModalProps } from '../types'
import {
  calcularTotalProduto,
  formatarDescontoAcrescimo,
  formatarNumeroComMilhar,
  formatarValorComplemento,
  obterTotalComplemento,
} from '@/src/domain/services/pedido/CalculadoraPedido'
import { resolverMenuCatalogoNovoPedido } from '@/src/domain/policies/pedido/CatalogoVendaPolicy'
import type { CanalVendaNovoPedido } from '../novoPedidoProdutosApi'
import { showToast } from '@/src/shared/utils/toast'
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
import { useRascunhoPedidoWhatsApp } from './form/useRascunhoPedidoWhatsApp'
import { limparRascunhoPedidoWhatsApp, obterRascunhoPedidoWhatsApp } from '../rascunho/rascunhoPedidoWhatsAppCache'
import { telefoneWhatsAppParaCampoPedido, digitosTelefonePedidoWhatsApp } from '@/src/presentation/gestor-pedidos/whatsapp/telefonePedidoWhatsApp'
import { useNovoPedidoFormState } from './orchestrator/useNovoPedidoFormState'
import { useEdicaoProdutosDelivery } from './orchestrator/useEdicaoProdutosDelivery'
import { useNovoPedidoGestorActions } from './orchestrator/useNovoPedidoGestorActions'
import { useNovoPedidoOrchestratorEffects } from './orchestrator/useNovoPedidoOrchestratorEffects'
import { createNovoPedidoResetForm } from './orchestrator/createNovoPedidoResetForm'
import { assembleNovoPedidoContextSlices } from './orchestrator/assembleNovoPedidoContextSlices'
import { usarTrocoLancamentoPedido } from '@/src/domain/services/pedido/CalculadoraPagamentoPedido'
import { canSubmitNovoPedido } from './orchestrator/canSubmitNovoPedido'
import { useNovoPedidoOrchestratorFlags } from './orchestrator/useNovoPedidoOrchestratorFlags'
import { useCotacaoTaxaPorMoradas } from '@/src/presentation/hooks/useCotacaoTaxaPorMoradas'
import { resolverModoTaxaEntregaOverride } from '@/src/shared/constants/taxaEntregaPedido'
import { enderecoTemGeolocalizacao } from '@/src/shared/utils/geolocalizacaoEnderecoShared'
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
  clienteInicial = null,
  telefoneInicial,
  statusEtapaOperacionalHint = null,
  entregadorHint = null,
  preservarRascunhoAoFechar = false,
  chaveRascunho,
}: NovoPedidoModalProps) {
  const { empresa, menuVendaGestorId, isLoading: empresaMeLoading } = useEmpresaMe()
  const { menuDeliveryId, isLoading: menuDeliveryLoading } = useMenuDeliveryId()
  const { preferenciasImpressaoDelivery } = usePreferenciasImpressaoDelivery()
  const { processarAposTransicaoVendaGestorId } = useImpressaoDelivery()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()
  const resetarAoSairRef = useRef(false)
  const notificarSucesso = useCallback(() => {
    resetarAoSairRef.current = true
    if (chaveRascunho) limparRascunhoPedidoWhatsApp(chaveRascunho)
    onSuccess()
  }, [chaveRascunho, onSuccess])
  const createVendaGestor = useCreateVendaGestor()
  const createPedidoDelivery = useCreatePedidoDelivery()
  const createSubmitPending =
    createVendaGestor.isPending || createPedidoDelivery.isPending
  const { iniciarSubmit, finalizarSubmit } = useNovoPedidoSubmitGuard(createSubmitPending)
  const cancelarVendaGestor = useCancelarVendaGestor()
  const cancelarNotaFiscalVendaPdv = useCancelarNotaFiscalVendaPdv()
  const cancelarNotaFiscalVendaGestor = useCancelarNotaFiscalVendaGestor()
  const transicaoPedidoDelivery = useTransicaoPedidoDelivery()

  const form = useNovoPedidoFormState(tipoInicioPedido)
  const [editandoItensNoDetalhe, setEditandoItensNoDetalhe] = useState(false)
  const [ajustandoPagamentoAposEdicaoItens, setAjustandoPagamentoAposEdicaoItens] = useState(false)
  const editandoProdutosPedido = Boolean(modoEdicaoProdutos || editandoItensNoDetalhe)
  const fecharEdicaoProdutosRef = useRef<() => void>(() => {})
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
    observacaoNota,
    setObservacaoNota,
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
    abrirCadastroRapidoEntregaPedido,
    setAbrirCadastroRapidoEntregaPedido,
    tooltipGrupoId,
    setTooltipGrupoId,
    tooltipPosition,
    setTooltipPosition,
    currentStep,
    setCurrentStep,
    moradaEntregaSelecionada,
    setMoradaEntregaSelecionada,
    enderecoEntregaCoberturaStatus,
    setEnderecoEntregaCoberturaStatus,
    enderecoEntregaCoberturaValorTaxa,
    setEnderecoEntregaCoberturaValorTaxa,
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

  useRascunhoPedidoWhatsApp({
    ativo: preservarRascunhoAoFechar,
    chave: chaveRascunho,
    sucessoRef: resetarAoSairRef,
    currentStep,
    produtos,
    observacaoPedido,
    pagamentos,
    clienteId,
    clienteNome,
    clienteEntregaVinculado,
    moradaEntregaSelecionada,
    telefoneBuscaEntrega,
    telefoneBuscadoEntrega,
    tipoAtendimentoDelivery,
    fluxoPagamentoEntrega,
    taxaEntregaId,
    tempoPrevistoMinutos,
    enderecoEntregaCoberturaStatus,
    enderecoEntregaCoberturaValorTaxa,
    setCurrentStep,
    setProdutos,
    setObservacaoPedido,
    setPagamentos,
    setClienteId,
    setClienteNome,
    setClienteEntregaVinculado,
    setMoradaEntregaSelecionada,
    setTelefoneBuscaEntrega,
    setTelefoneBuscadoEntrega,
    setTipoAtendimentoDelivery,
    setFluxoPagamentoEntrega,
    setTaxaEntregaId,
    setTempoPrevistoMinutos,
    setEnderecoEntregaCoberturaStatus,
    setEnderecoEntregaCoberturaValorTaxa,
  })

  const tipoVendaHint = tipoVendaGestor ?? detalhesPedidoMeta?.tipoVenda ?? null

  const { pedidoDeliveryGestor, pedidoComEntrega, pedidoComRetirada } = useNovoPedidoDelivery({
    tipoInicioPedido,
    tipoAtendimentoDelivery,
    tabelaOrigemVenda,
    tipoVendaHint,
  })
  const pedidoBalcao = tipoInicioPedido !== 'delivery'
  const canalVendaNovoPedido: CanalVendaNovoPedido =
    tipoInicioPedido === 'delivery' ? 'entrega' : 'balcao'
  const menuCatalogoId = resolverMenuCatalogoNovoPedido(
    canalVendaNovoPedido,
    menuDeliveryId,
    menuVendaGestorId
  )
  const menuIdCarregando =
    canalVendaNovoPedido === 'entrega' ? menuDeliveryLoading : empresaMeLoading
  /** Balcão e delivery: passo de produtos é sempre o step 1 na criação. */
  const estaNoPassoProdutos =
    open && (editandoProdutosPedido || (!modoVisualizacao && currentStep === 1))

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
  const token = useAuthStore.getState().tenantAuth?.getAccessToken()

  const {
    grupos,
    isLoadingGruposVenda,
    produtosList,
    buscaProdutoFiltrada,
    isLoadingProdutosVenda,
    isLoadingBuscaProdutos,
    isLoadingProdutos,
    produtosError,
    hasNextProdutosCatalogo,
    isFetchingNextProdutosCatalogo,
    carregarProximaPaginaProdutosCatalogo,
    carregarProdutoNoCatalogoSeNecessario,
    menuCatalogoIndisponivel,
  } = useNovoPedidoCatalogoData({
    estaNoPassoProdutos,
    token,
    menuId: menuCatalogoId,
    menuIdCarregando,
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
    hidratarFiscalProdutoNasLinhas,
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
    getAccessToken: () => useAuthStore.getState().tenantAuth?.getAccessToken(),
  })

  useEffect(() => {
    if (!open || vendaId || modoVisualizacao) return
    if (tipoInicioPedido !== 'delivery') return

    const telCampo = telefoneWhatsAppParaCampoPedido(telefoneInicial)
    const digitos = digitosTelefonePedidoWhatsApp(telefoneInicial)
    if (telCampo) {
      setTelefoneBuscaEntrega(atual => (atual.trim() ? atual : telCampo))
      setTelefoneBuscadoEntrega(atual => atual || digitos || null)
    }

    if (preservarRascunhoAoFechar && chaveRascunho && obterRascunhoPedidoWhatsApp(chaveRascunho)) {
      return
    }
    if (clienteInicial) {
      handleSelectCliente(clienteInicial)
    }
  }, [
    open,
    vendaId,
    modoVisualizacao,
    clienteInicial,
    telefoneInicial,
    tipoInicioPedido,
    handleSelectCliente,
    setTelefoneBuscaEntrega,
    setTelefoneBuscadoEntrega,
    preservarRascunhoAoFechar,
    chaveRascunho,
  ])

  // Buscar meios de pagamento
  const {
    data: meiosPagamentoData,
    isPending: isPendingMeiosPagamento,
    isFetching: isFetchingMeiosPagamento,
  } = useMeiosPagamentoInfinite({
    limit: 100,
    // POS filtra por ativo; delivery filtra só por ativoDelivery (independente do POS).
    ...(pedidoDeliveryGestor ? { ativoDelivery: true } : { ativo: true }),
    // Step 3 usa meios de pagamento; em visualizacao/edicao pode ser usado para resolver nomes.
    enabled: open && (currentStep >= 3 || modoVisualizacao || !!vendaId),
    refetchOnWindowFocus: false,
  })

  const meiosPagamento = useMemo(() => {
    if (!meiosPagamentoData?.pages) return []
    const lista = meiosPagamentoData.pages.flatMap(page => page.meiosPagamento || [])
    return ordenarMeiosPagamentoPadrao(lista)
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

  const modoTaxaEntrega = resolverModoTaxaEntregaOverride(taxaEntregaId)
  const telefoneCotacao =
    telefoneBuscadoEntrega ||
    moradaEntregaSelecionada?.telefone ||
    telefoneBuscaEntrega ||
    ''
  const cotacaoTaxa = useCotacaoTaxaPorMoradas({
    enabled:
      open &&
      !modoVisualizacao &&
      !vendaId &&
      pedidoDeliveryGestor &&
      pedidoComEntrega &&
      modoTaxaEntrega === 'automatica' &&
      Boolean(moradaEntregaSelecionada?.id) &&
      Boolean(
        moradaEntregaSelecionada?.endereco &&
          enderecoTemGeolocalizacao(moradaEntregaSelecionada.endereco)
      ),
    telefone: telefoneCotacao,
    enderecoId: moradaEntregaSelecionada?.id ?? '',
    produtos,
  })
  const cotacaoTaxaStatus = cotacaoTaxa.status
  const cotacaoTaxaValor = cotacaoTaxa.status === 'ok' ? cotacaoTaxa.valorTaxa : null

  const recotarTaxaEntregaAutomatica = useCallback(() => {
    const morada = moradaEntregaSelecionada
    if (!morada?.id) return
    if (!morada.endereco || !enderecoTemGeolocalizacao(morada.endereco)) {
      showToast.error('Este endereço não tem localização. Edite o endereço para calcular a taxa.')
      return
    }
    setEnderecoEntregaCoberturaStatus('pendente')
    setEnderecoEntregaCoberturaValorTaxa(null)
    void cotacaoTaxa.recotar()
  }, [
    moradaEntregaSelecionada,
    cotacaoTaxa.recotar,
    setEnderecoEntregaCoberturaStatus,
    setEnderecoEntregaCoberturaValorTaxa,
  ])

  useEffect(() => {
    if (!pedidoDeliveryGestor || !pedidoComEntrega || modoTaxaEntrega !== 'automatica') {
      return
    }
    if (!moradaEntregaSelecionada?.id) {
      setEnderecoEntregaCoberturaStatus(null)
      setEnderecoEntregaCoberturaValorTaxa(null)
      return
    }
    if (cotacaoTaxaStatus === 'idle') return
    if (cotacaoTaxaStatus === 'loading') {
      setEnderecoEntregaCoberturaStatus('pendente')
      setEnderecoEntregaCoberturaValorTaxa(null)
      return
    }
    if (cotacaoTaxaStatus === 'fora') {
      setEnderecoEntregaCoberturaStatus('fora')
      setEnderecoEntregaCoberturaValorTaxa(null)
      return
    }
    if (cotacaoTaxaStatus === 'ok') {
      setEnderecoEntregaCoberturaStatus('ok')
      setEnderecoEntregaCoberturaValorTaxa(cotacaoTaxaValor)
      return
    }
    setEnderecoEntregaCoberturaStatus('indisponivel')
    setEnderecoEntregaCoberturaValorTaxa(null)
  }, [
    pedidoDeliveryGestor,
    pedidoComEntrega,
    modoTaxaEntrega,
    moradaEntregaSelecionada?.id,
    cotacaoTaxaStatus,
    cotacaoTaxaValor,
    setEnderecoEntregaCoberturaStatus,
    setEnderecoEntregaCoberturaValorTaxa,
  ])

  const flags = useNovoPedidoOrchestratorFlags({
    modoVisualizacao,
    modoEdicaoProdutos: editandoProdutosPedido,
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
    enderecoEntregaCoberturaValorTaxa,
    resumoFinanceiroDetalhes,
    detalhesEntregaPedido,
    ajustandoPagamentoAposEdicaoItens,
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
    podeExibirCancelarPedidoDeliveryOperacional,
    podeExibirCancelarNotaFiscal,
    podeEditarPagamentoEntregaEmAberto,
    podeAjustarPagamentoEntregaEmAberto,
    pagamentoEntregaConfirmado,
    podeEditarItensPedidoDetalhe,
  } = flags

  /** Primeira carga ou fetch sem cache ainda — evita área vazia sem feedback */
  const mostrarLoadingFormasPagamento =
    isPendingMeiosPagamento || (isFetchingMeiosPagamento && meiosPagamentoData === undefined)

  // Refs estáveis: evitam que `carregarVendaExistente` mude quando queries atualizam ao focar a aba
  const meiosPagamentoRef = useRef(meiosPagamento)
  meiosPagamentoRef.current = meiosPagamento
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const tenantAuthRef = useRef(tenantAuth)
  tenantAuthRef.current = tenantAuth

  const tipoVendaParaDetalhe =
    tipoVendaGestor ??
    (tipoInicioPedido === 'delivery' ? 'delivery' : null)

  const { carregarVendaExistente, isLoadingVenda, setIsLoadingVenda, vendaDataUpdatedAt } =
    useCarregarVenda({
    open,
    vendaId,
    vendaIdCriada,
    modoVisualizacao,
    tabelaOrigemVenda,
    tipoVendaGestor: tipoVendaParaDetalhe,
    statusEtapaOperacionalHint,
    entregadorHint,
    meiosPagamentoRef,
    getToken: () => tenantAuthRef.current?.getAccessToken(),
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

  const trocoValidacao = usarTrocoLancamentoPedido(
    pagamentos,
    entregaComCobrancaPeloEntregador
  )
    ? trocoLancamento
    : troco

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
    telefoneClienteDelivery: telefoneBuscadoEntrega || telefoneBuscaEntrega,
    pedidoComEntrega,
    temEnderecoEntrega: Boolean(moradaEntregaSelecionada?.endereco),
    enderecoEntregaTemGeo: Boolean(
      moradaEntregaSelecionada?.endereco &&
        enderecoTemGeolocalizacao(moradaEntregaSelecionada.endereco)
    ),
    enderecoEntregaCoberturaStatus,
    taxaEntregaOverride: modoTaxaEntrega,
    modoEdicaoProdutos: editandoProdutosPedido,
    onFecharEdicaoProdutos: () => fecharEdicaoProdutosRef.current(),
    edicaoProdutosPermaneceNoPainel: editandoItensNoDetalhe,
    ajustandoPagamentoAposEdicaoItens,
    preservarRascunhoAoFechar,
    onAbrirCadastroRapidoCliente: () => setAbrirCadastroRapidoEntregaPedido(n => n + 1),
  })

  const handleConfirmarSaidaDescartando = useCallback(() => {
    resetarAoSairRef.current = true
    if (chaveRascunho) limparRascunhoPedidoWhatsApp(chaveRascunho)
    handleConfirmarSaida()
  }, [chaveRascunho, handleConfirmarSaida])

  const voltarAoDetalheAposEditarItens = useCallback(() => {
    setEditandoItensNoDetalhe(false)
    setCurrentStep(4)
    setAbaDetalhesPedido('listaProdutos')
  }, [setCurrentStep, setAbaDetalhesPedido])

  const handleSucessoEdicaoProdutos = useCallback(async () => {
    if (editandoItensNoDetalhe && vendaId) {
      await invalidateVendaDetalheCarregadaCache(queryClient, empresaId, vendaId)
      invalidateKanbanVendasListagens(queryClient)
      await carregarVendaExistente()
      setEditandoItensNoDetalhe(false)
      setCurrentStep(4)
      setAbaDetalhesPedido('pagamentos')
      setAjustandoPagamentoAposEdicaoItens(true)
      return
    }
    onSuccess()
  }, [
    editandoItensNoDetalhe,
    vendaId,
    queryClient,
    empresaId,
    carregarVendaExistente,
    setCurrentStep,
    setAbaDetalhesPedido,
    onSuccess,
  ])

  const { salvandoProdutos, handleSalvarProdutos, handleCancelarEdicao } = useEdicaoProdutosDelivery({
    ativo: editandoProdutosPedido,
    vendaId,
    getToken: () => tenantAuthRef.current?.getAccessToken(),
    produtos,
    observacaoPedido,
    vendaDataUpdatedAt,
    onSuccess: handleSucessoEdicaoProdutos,
    onClose: editandoItensNoDetalhe ? voltarAoDetalheAposEditarItens : onClose,
    setInternalDialogOpen,
    permanecerNoPainel: editandoItensNoDetalhe,
    restaurarProdutos: setProdutos,
  })
  fecharEdicaoProdutosRef.current = handleCancelarEdicao

  const handleEditarPedidoNoDetalhe = useCallback(() => {
    if (!podeEditarItensPedidoDetalhe) return
    setAjustandoPagamentoAposEdicaoItens(false)
    setEditandoItensNoDetalhe(true)
    setCurrentStep(1)
  }, [podeEditarItensPedidoDetalhe, setCurrentStep])

  useEffect(() => {
    if (!open) {
      setEditandoItensNoDetalhe(false)
      setAjustandoPagamentoAposEdicaoItens(false)
    }
  }, [open])

  const handleAbaDetalhesPedidoChange = useCallback(
    (aba: typeof abaDetalhesPedido) => {
      if (ajustandoPagamentoAposEdicaoItens && aba !== 'pagamentos') {
        showToast.warning('Ajuste o pagamento do pedido para continuar.')
        return
      }
      setAbaDetalhesPedido(aba)
    },
    [ajustandoPagamentoAposEdicaoItens, setAbaDetalhesPedido]
  )

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
      taxaEntregaId,
      taxaEntregaCoberturaValor: enderecoEntregaCoberturaValorTaxa,
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
      enderecoEntregaTemGeo: Boolean(
        moradaEntregaSelecionada?.endereco &&
          enderecoTemGeolocalizacao(moradaEntregaSelecionada.endereco)
      ),
      enderecoEntregaCoberturaStatus,
      taxaEntregaOverride: modoTaxaEntrega,
      troco: trocoValidacao,
    },
    createVendaGestor,
    createPedidoDelivery,
    onSuccess: notificarSucesso,
    onClose,
    setInternalDialogOpen,
    setCurrentStep,
    setVendaIdCriada,
    observacaoNota,
    status,
    tipoInicioPedido,
    processarAposTransicaoVendaGestorId,
    preferenciasAutoIniciarPreparo: preferenciasImpressaoDelivery.autoIniciarPreparoNovosPedidos,
    accessToken: useAuthStore.getState().tenantAuth?.getAccessToken(),
  })

  const formatarDataDetalhePedido = useCallback(
    (valor: string | null | undefined) => formatarDataDetalhePedidoOrchestrator(valor),
    []
  )

  const formatarUsuarioPorId = useCallback(
    (usuarioId: string | null | undefined) => {
      const id = String(usuarioId || '').trim()
      const nome = nomeUsuario.trim()
      if (id && nome) {
        const tenantId = tenantAuth?.getUser()?.getId()?.trim() ?? ''
        const identityId =
          useAuthStore.getState().identityAuth?.getUser()?.getId()?.trim() ?? ''
        if ((tenantId && id === tenantId) || (identityId && id === identityId)) {
          return nome
        }
      }
      return formatarUsuarioPorIdOrchestrator(usuarioId, nomesUsuariosPedido)
    },
    [nomesUsuariosPedido, tenantAuth, nomeUsuario]
  )

  const rotuloModeloNfe = rotuloModeloNfeOrchestrator

  const gestorActions = useNovoPedidoGestorActions({
    vendaId,
    tabelaOrigemVenda,
    onSuccess,
    onClose,
    cancelarVendaGestor,
    cancelarNotaFiscalVendaPdv,
    cancelarNotaFiscalVendaGestor,
    transicaoPedidoDelivery,
    form,
    catalogoProdutosPorId,
    produtosList,
    setInternalDialogOpen,
    totalProdutos,
    totalPagamentosLancados,
    trocoLancamento,
    usarModuloDeliveryCobrancas: pedidoDeliveryGestor,
    recarregarVendaExistente: carregarVendaExistente,
    confirmarPagamentoParaFinalizar:
      Boolean(modoVisualizacao) && abaDetalhesInicial === 'pagamentos',
    ajustandoPagamentoAposEdicaoItens,
    onPagamentoEntregaSalvo: () => setAjustandoPagamentoAposEdicaoItens(false),
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
    editandoItensNoDetalhe,
    ajustandoPagamentoAposEdicaoItens,
    tipoInicioPedido,
    abaDetalhesInicial,
    vendaDataUpdatedAt,
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
    preservarRascunhoAoFechar,
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

  const handlePedidoPainelExited = useNovoPedidoResetOnExit(
    resetForm,
    () => {
      resetarAoSairRef.current = false
      onAfterClose?.()
    },
    () => !preservarRascunhoAoFechar || resetarAoSairRef.current
  )

  const temEnderecoEntrega = Boolean(moradaEntregaSelecionada?.endereco)
  const enderecoEntregaTemGeo = Boolean(
    moradaEntregaSelecionada?.endereco &&
      enderecoTemGeolocalizacao(moradaEntregaSelecionada.endereco)
  )

  const canSubmit = () =>
    canSubmitNovoPedido({
      pedidoDeliveryGestor,
      clienteEntregaVinculadoId: clienteEntregaVinculado?.id,
      telefoneClienteDelivery: telefoneBuscadoEntrega,
      pedidoComEntrega,
      temEnderecoEntrega,
      enderecoEntregaTemGeo,
      enderecoEntregaCoberturaStatus,
      taxaEntregaOverride: modoTaxaEntrega,
      pedidoEntregaAceitaPagamentoPendente,
      entregaComCobrancaPeloEntregador,
      produtosCount: produtos.length,
      produtos,
      pagamentos,
      totalProdutos,
      totalPagamentos,
      troco: trocoValidacao,
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
    transicaoPedidoDelivery,
    catalogoProdutosPorId,
    clienteTabsModalEntregaState,
    clienteEntregaVinculado,
    clienteNome,
    nomeUsuario,
    usuarioLogadoId: tenantAuth?.getUser()?.getId()?.trim() ?? '',
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
    handleConfirmarSaida: handleConfirmarSaidaDescartando,
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
    menuCatalogoIndisponivel,
    hasNextProdutosCatalogo,
    isFetchingNextProdutosCatalogo,
    carregarProximaPaginaProdutosCatalogo,
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
    setMoradaEntregaSelecionada,
    enderecoEntregaCoberturaStatus,
    setEnderecoEntregaCoberturaStatus,
    enderecoEntregaCoberturaValorTaxa,
    setEnderecoEntregaCoberturaValorTaxa,
    recotarTaxaEntregaAutomatica,
    cotacaoTaxaEntregaBuscando: cotacaoTaxa.isFetching || cotacaoTaxaStatus === 'loading',
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
    observacaoNota,
    setObservacaoNota,
    origem,
    statusFiscalDetalhe,
    pagamentoModoCobranca,
    painelLinhaModo,
    pagamentos,
    pagamentosVisiveisNaAbaDetalhes,
    podeEditarPagamentoEntregaEmAberto,
    podeAjustarPagamentoEntregaEmAberto,
    pagamentoEntregaConfirmado,
    ajustandoPagamentoAposEdicaoItens,
    modoEdicaoProdutos: editandoProdutosPedido,
    podeEditarItensPedidoDetalhe,
    handleEditarPedidoNoDetalhe,
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
    hidratarFiscalProdutoNasLinhas,
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
    setPagamentos,
    setProdutoIndexEdicao,
    setProdutoParaLancamentoPainel,
    setQuantidadeEdicao,
    setUnidadeMedidaEdicao,
    setOrigem,
    setSeletorClienteOpen,
    setAbrirCadastroRapidoEntregaPedido,
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
    abrirCadastroRapidoEntregaPedido,
  })

  const shell: NovoPedidoShellProps = {
    internalDialogOpen,
    handleDialogOpenChange,
    handlePedidoPainelExited,
    estaNoPassoProdutos,
    modoVisualizacao,
    modoEdicaoProdutos: editandoProdutosPedido,
    salvandoProdutos,
    onSalvarProdutos: handleSalvarProdutos,
    onCancelarEdicaoProdutos: handleCancelarEdicao,
    nomeUsuario,
    currentStep,
    isLoadingVenda,
    abaDetalhesPedido,
    setAbaDetalhesPedido: handleAbaDetalhesPedidoChange,
    bloquearAbasDetalhe: ajustandoPagamentoAposEdicaoItens,
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
    podeExibirCancelarPedidoDeliveryOperacional,
    podeExibirCancelarNotaFiscal,
    isSavingPagamentoEntrega,
    onSalvarPagamentoEntrega: handleSalvarPagamentoEntregaEmAberto,
  }

  return { contextValue: novoPedidoContextValue, shell }
}
