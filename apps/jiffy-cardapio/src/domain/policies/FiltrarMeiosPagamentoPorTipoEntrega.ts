import type { DeliveryTipoEntrega } from '../types/entrega'
import {
  resolverFlagsCanalDelivery,
  type MeioPagamentoCanalDeliveryInput,
} from '@jiffy/resolver-flags-canal-delivery'

export type { MeioPagamentoCanalDeliveryInput }
export { resolverFlagsCanalDelivery }

/** Mesma regra de `MeioPagamento.disponivelParaTipoEntrega` no Gestor. */
export function meioDisponivelParaTipoEntrega(
  meio: MeioPagamentoCanalDeliveryInput,
  tipoEntrega: DeliveryTipoEntrega
): boolean {
  const flags = resolverFlagsCanalDelivery(meio)
  return tipoEntrega === 'entrega' ? flags.ativoEntregaDelivery : flags.ativoRetiradaDelivery
}

/** Retorna os meios habilitados para o canal escolhido no checkout público. */
export function filtrarMeiosPagamentoPorTipoEntrega<T extends MeioPagamentoCanalDeliveryInput>(
  meiosPagamento: readonly T[],
  tipoEntrega: DeliveryTipoEntrega
): T[] {
  return meiosPagamento.filter(meio => meioDisponivelParaTipoEntrega(meio, tipoEntrega))
}
