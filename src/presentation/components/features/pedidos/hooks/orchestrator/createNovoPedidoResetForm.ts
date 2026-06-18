import { Produto } from '@/src/domain/entities/Produto'
import { statusPadraoNovoPedido } from '@/src/domain/services/pedido/RegrasStatusPedido'
import type { NovoPedidoFormState } from './useNovoPedidoFormState'

export type CreateNovoPedidoResetFormParams = {
  tipoInicioPedido: 'balcao' | 'entrega'
  form: NovoPedidoFormState
  limparLongPressTimeouts: () => void
  resetEdicaoLinha: () => void
  setClienteTabsModalEntregaState: (state: {
    open: boolean
    tab: 'cliente' | 'visualizar'
    mode: 'edit' | 'create'
    clienteId?: string
  }) => void
  setModalLancamentoProdutoPainelOpen: (open: boolean) => void
  setProdutoParaLancamentoPainel: (produto: Produto | null) => void
  setIndiceLinhaPainelProduto: (index: number | null) => void
  setPainelLinhaModo: (modo: import('../../components/ModalLancamentoProdutoPainel').ModalLancamentoProdutoPainelModo) => void
  setModalEdicaoProdutoOpen: (open: boolean) => void
  setProdutoIndexEdicao: (index: number | null) => void
  setQuantidadeEdicao: (q: number) => void
  setEhAcrescimo: (v: boolean) => void
  setEhPorcentagem: (v: boolean) => void
  setValorDescontoAcrescimo: (v: string) => void
  setValorUnitarioEdicaoPainel: (v: string) => void
  setModalConfirmacaoSaidaOpen: (open: boolean) => void
  setIsLoadingVenda: (loading: boolean) => void
}

export function createNovoPedidoResetForm({
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
}: CreateNovoPedidoResetFormParams) {
  return () => {
    limparLongPressTimeouts()
    resetEdicaoLinha()

    form.setOrigem('GESTOR')
    form.setStatus(statusPadraoNovoPedido(tipoInicioPedido))
    form.setClienteId('')
    form.setClienteNome('')
    form.setMoradaEntregaSelecionada(null)
    form.setTelefoneBuscaEntrega('')
    form.setTelefoneBuscadoEntrega(null)
    form.setTempoPrevistoMinutos(45)
    form.setTaxaEntregaId('')
    form.setClienteEntregaVinculado(null)
    setClienteTabsModalEntregaState({ open: false, tab: 'cliente', mode: 'edit' })
    form.setProdutos([])
    form.setObservacaoPedido('')
    form.setPagamentos([])
    form.setMeioPagamentoId('')
    form.setValorRecebido('')
    form.setFluxoPagamentoEntrega('cobrar_entregador')
    form.setTipoAtendimentoDelivery('entrega')
    form.setGrupoSelecionadoId(null)
    form.setCurrentStep(1)
    setModalLancamentoProdutoPainelOpen(false)
    setProdutoParaLancamentoPainel(null)
    setIndiceLinhaPainelProduto(null)
    setPainelLinhaModo('lancamento')
    setModalEdicaoProdutoOpen(false)
    setProdutoIndexEdicao(null)
    setQuantidadeEdicao(1)
    setEhAcrescimo(false)
    setEhPorcentagem(false)
    setValorDescontoAcrescimo('0')
    setValorUnitarioEdicaoPainel('')
    form.setValorFinalVenda(null)
    form.setSeletorClienteOpen(false)
    setModalConfirmacaoSaidaOpen(false)
    form.setDataFinalizacaoCarregada(null)
    form.setVendaGestorJaCancelada(false)
    form.setModalCancelarVendaOpen(false)
    form.setJustificativaCancelamento('')
    form.setAbaDetalhesPedido('infoPedido')
    form.setResumoFiscal(null)
    form.setStatusFiscalDetalhe(null)
    form.setDetalhesPedidoMeta(null)
    form.setDetalhesEntregaPedido(null)
    form.setNomesUsuariosPedido({})
    form.setNomesMeiosPagamentoPedido({})
    form.setResumoFinanceiroDetalhes(null)
    form.setVendaIdCriada(null)
    form.setDataVenda('')
    form.setNomeUsuario('')
    form.setCatalogoProdutosPorId({})
    setIsLoadingVenda(false)
  }
}
