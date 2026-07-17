import { validarPedidoGestor } from '@/src/domain/services/pedido/ValidadorPedidoGestor'
import type { ValidarPedidoGestorResult } from '@/src/domain/services/pedido/ValidadorPedidoGestor'
import type { PagamentoSelecionado, ProdutoSelecionado, StatusVenda } from '../../types'

export type CanSubmitNovoPedidoParams = {
  pedidoDeliveryGestor: boolean
  clienteEntregaVinculadoId?: string
  pedidoComEntrega: boolean
  temEnderecoEntrega: boolean
  modoTempo?: 'imediato' | 'agendado'
  slotInicio?: string
  pedidoEntregaAceitaPagamentoPendente: boolean
  entregaComCobrancaPeloEntregador: boolean
  produtosCount: number
  produtos?: ProdutoSelecionado[]
  pagamentos: PagamentoSelecionado[]
  totalProdutos: number
  totalPagamentos: number
  troco: number
  pedidoGestorComPagamentoNoPasso3: boolean
  pedidoComRetirada: boolean
  status: StatusVenda
}

export function validarNovoPedidoSubmit(
  params: CanSubmitNovoPedidoParams
): ValidarPedidoGestorResult {
  return validarPedidoGestor({
    produtosCount: params.produtosCount,
    produtos: params.produtos,
    pedidoDeliveryGestor: params.pedidoDeliveryGestor,
    clienteEntregaVinculadoId: params.clienteEntregaVinculadoId,
    pedidoComEntrega: params.pedidoComEntrega,
    temEnderecoEntrega: params.temEnderecoEntrega,
    modoTempo: params.modoTempo,
    slotInicio: params.slotInicio,
    pedidoGestorComPagamentoNoPasso3: params.pedidoGestorComPagamentoNoPasso3,
    pedidoEntregaAceitaPagamentoPendente: params.pedidoEntregaAceitaPagamentoPendente,
    pagamentosCount: params.pagamentos.length,
    entregaComCobrancaPeloEntregador: params.entregaComCobrancaPeloEntregador,
    pedidoComRetirada: params.pedidoComRetirada,
    totalProdutos: params.totalProdutos,
    totalPagamentos: params.totalPagamentos,
    troco: params.troco,
    status: params.status,
    pagamentos: params.pagamentos,
  })
}

export function canSubmitNovoPedido(params: CanSubmitNovoPedidoParams): boolean {
  return validarNovoPedidoSubmit(params).podeSubmeter
}
