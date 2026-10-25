import type { TipoAtendimentoDelivery } from '@/src/domain/types/vendaDetalhe'

type DeveLimparPagamentosAoTrocarTipoParams = {
  tipoAtual: TipoAtendimentoDelivery
  tipoNovo: TipoAtendimentoDelivery
  pedidoExistente: boolean
}

/** Pedido novo: trocar entrega/retirada invalida os meios já escolhidos. */
export function deveLimparPagamentosAoTrocarTipo({
  tipoAtual,
  tipoNovo,
  pedidoExistente,
}: DeveLimparPagamentosAoTrocarTipoParams): boolean {
  return !pedidoExistente && tipoAtual !== tipoNovo
}
