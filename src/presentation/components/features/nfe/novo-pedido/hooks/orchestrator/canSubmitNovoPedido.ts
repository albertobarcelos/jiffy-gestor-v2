import { validarPedidoGestor } from '@/src/domain/services/pedido/ValidadorPedidoGestor'
import type { PagamentoSelecionado, StatusVenda } from '../../types'

export type CanSubmitNovoPedidoParams = {
  pedidoDeliveryGestor: boolean
  clienteEntregaVinculadoId?: string
  pedidoComEntrega: boolean
  temEnderecoEntrega: boolean
  pedidoEntregaAceitaPagamentoPendente: boolean
  entregaComCobrancaPeloEntregador: boolean
  produtosCount: number
  pagamentos: PagamentoSelecionado[]
  totalProdutos: number
  totalPagamentos: number
  troco: number
  pedidoGestorComPagamentoNoPasso3: boolean
  pedidoComRetirada: boolean
  status: StatusVenda
}

export function canSubmitNovoPedido(params: CanSubmitNovoPedidoParams): boolean {
  return validarPedidoGestor({
    produtosCount: params.produtosCount,
    pedidoDeliveryGestor: params.pedidoDeliveryGestor,
    clienteEntregaVinculadoId: params.clienteEntregaVinculadoId,
    pedidoComEntrega: params.pedidoComEntrega,
    temEnderecoEntrega: params.temEnderecoEntrega,
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
  }).podeSubmeter
}
