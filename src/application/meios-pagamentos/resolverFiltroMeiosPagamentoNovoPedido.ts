import type { TipoAtendimentoDelivery } from '@/src/domain/types/vendaDetalhe'

export type FiltroListagemMeiosNovoPedido = {
  ativo?: true
  ativoEntregaDelivery?: true
  ativoRetiradaDelivery?: true
}

type ResolverFiltroMeiosPagamentoNovoPedidoParams = {
  pedidoDeliveryGestor: boolean
  pedidoComRetirada: boolean
  pedidoExistente: boolean
  tipoEntregaPedidoExistente?: TipoAtendimentoDelivery | null
}

/**
 * Monta o filtro da listagem de meios no Novo Pedido.
 * A regra de canal (entrega/retirada) fica na entidade; aqui só o contrato da query.
 */
export function resolverFiltroMeiosPagamentoNovoPedido({
  pedidoDeliveryGestor,
  pedidoComRetirada,
  pedidoExistente,
  tipoEntregaPedidoExistente = null,
}: ResolverFiltroMeiosPagamentoNovoPedidoParams): FiltroListagemMeiosNovoPedido {
  if (!pedidoDeliveryGestor) {
    return { ativo: true }
  }

  const tipo = pedidoExistente
    ? tipoEntregaPedidoExistente
    : pedidoComRetirada
      ? 'retirada'
      : 'entrega'

  if (tipo === 'entrega') return { ativoEntregaDelivery: true }
  if (tipo === 'retirada') return { ativoRetiradaDelivery: true }
  return {}
}
