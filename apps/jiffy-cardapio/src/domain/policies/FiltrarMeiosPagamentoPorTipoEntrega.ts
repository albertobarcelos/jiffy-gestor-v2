import type { DeliveryTipoEntrega } from '../types/entrega'

/** Payload público ou legado (`ativoDelivery` / `isDelivery`). */
export type MeioPagamentoCanalDeliveryInput = {
  ativoEntregaDelivery?: unknown
  ativoRetiradaDelivery?: unknown
  ativoDelivery?: unknown
  isDelivery?: unknown
}

function parseBooleanFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

/** Mesma hidratação de `MeioPagamento.fromJSON` no Gestor. */
export function resolverFlagsCanalDelivery(meio: MeioPagamentoCanalDeliveryInput): {
  ativoEntregaDelivery: boolean
  ativoRetiradaDelivery: boolean
} {
  const legado = meio.ativoDelivery ?? meio.isDelivery
  return {
    ativoEntregaDelivery: parseBooleanFlag(meio.ativoEntregaDelivery ?? legado),
    ativoRetiradaDelivery: parseBooleanFlag(meio.ativoRetiradaDelivery ?? legado),
  }
}

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
