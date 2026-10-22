import type { TipoAtendimentoDelivery } from '@/src/domain/types/vendaDetalhe'

interface ResolverFiltroMeiosPagamentoNovoPedidoParams {
  pedidoDeliveryGestor: boolean
  pedidoComRetirada: boolean
  pedidoExistente: boolean
  tipoEntregaPedidoExistente?: TipoAtendimentoDelivery | null
}

export function resolverFiltroMeiosPagamentoNovoPedido({
  pedidoDeliveryGestor,
  pedidoComRetirada,
  pedidoExistente,
  tipoEntregaPedidoExistente = null,
}: ResolverFiltroMeiosPagamentoNovoPedidoParams) {
  if (!pedidoDeliveryGestor) {
    return { ativo: true }
  }

  if (pedidoExistente) {
    if (tipoEntregaPedidoExistente === 'entrega') {
      return { ativoEntregaDelivery: true }
    }
    if (tipoEntregaPedidoExistente === 'retirada') {
      return { ativoRetiradaDelivery: true }
    }
    return {}
  }

  return pedidoComRetirada
    ? { ativoRetiradaDelivery: true }
    : { ativoEntregaDelivery: true }
}

interface DeveLimparPagamentosAoTrocarTipoParams {
  tipoAtual: TipoAtendimentoDelivery
  tipoNovo: TipoAtendimentoDelivery
  pedidoExistente: boolean
}

export function deveLimparPagamentosAoTrocarTipo({
  tipoAtual,
  tipoNovo,
  pedidoExistente,
}: DeveLimparPagamentosAoTrocarTipoParams): boolean {
  return !pedidoExistente && tipoAtual !== tipoNovo
}
