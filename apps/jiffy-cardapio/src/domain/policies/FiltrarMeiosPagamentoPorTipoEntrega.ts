import type { DeliveryTipoEntrega } from '../types/entrega'

type MeioPagamentoComDisponibilidadeDelivery = {
  ativoEntregaDelivery: boolean
  ativoRetiradaDelivery: boolean
}

/** Retorna os meios habilitados para o canal escolhido no checkout público. */
export function filtrarMeiosPagamentoPorTipoEntrega<
  T extends MeioPagamentoComDisponibilidadeDelivery,
>(meiosPagamento: readonly T[], tipoEntrega: DeliveryTipoEntrega): T[] {
  return meiosPagamento.filter(meio =>
    tipoEntrega === 'entrega'
      ? meio.ativoEntregaDelivery
      : meio.ativoRetiradaDelivery
  )
}
