/** Payload da API, público ou legado (`ativoDelivery` / `isDelivery`). */
export type MeioPagamentoCanalDeliveryInput = {
  ativoEntregaDelivery?: unknown
  ativoRetiradaDelivery?: unknown
  ativoDelivery?: unknown
  isDelivery?: unknown
}

function parseBooleanFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

/**
 * Hidrata os canais. Flag nova ganha. Legado liga os dois.
 * Usado no Gestor (`MeioPagamento.fromJSON`) e no cardápio.
 */
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
