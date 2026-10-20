/** Janela anti-duplicata entre impressão local pós-transição e comando Socket.IO. */
export const IMPRESSAO_DELIVERY_DEDUPE_TTL_MS = 20_000

const recentes = new Map<string, number>()

function limparExpirados(now: number): void {
  for (const [vendaId, at] of recentes) {
    if (now - at > IMPRESSAO_DELIVERY_DEDUPE_TTL_MS) {
      recentes.delete(vendaId)
    }
  }
}

export function jaImprimiuDeliveryRecentemente(
  vendaId: string,
  now: number = Date.now()
): boolean {
  const id = vendaId.trim()
  if (!id) return false
  limparExpirados(now)
  const at = recentes.get(id)
  if (at == null) return false
  return now - at <= IMPRESSAO_DELIVERY_DEDUPE_TTL_MS
}

export function marcarImpressaoDeliveryRecente(
  vendaId: string,
  now: number = Date.now()
): void {
  const id = vendaId.trim()
  if (!id) return
  limparExpirados(now)
  recentes.set(id, now)
}

/** Apenas testes. */
export function limparDedupeImpressaoDelivery(): void {
  recentes.clear()
}
