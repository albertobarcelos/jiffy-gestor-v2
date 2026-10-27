/** Via de produção na cozinha. */
export type KindViaProducaoPedido = 'single' | 'unit' | 'conference'

function kindDe(kind: string): string {
  return String(kind ?? '').trim().toLowerCase()
}

/** Conferência só junta slips. Uma unidade não tem o que conferir. */
export function porUnidadeGeraConferencia(totalUnidades: number): boolean {
  return totalUnidades > 1
}

/**
 * Uma unidade é a via do pedido (`single`), não um slip.
 * Várias unidades viram slips (`unit`) + conferência.
 */
export function kindSlipPorUnidade(totalUnidades: number): KindViaProducaoPedido {
  return porUnidadeGeraConferencia(totalUnidades) ? 'unit' : 'single'
}

/** QR/barras na via que identifica o pedido — nunca no papel unitário. */
export function viaProducaoLevaSimboloPedido(kind: string): boolean {
  return kindDe(kind) !== 'unit'
}
