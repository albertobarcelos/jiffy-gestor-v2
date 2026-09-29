/** ISO de início/fim de preparo: só vale se o relógio conseguir parsear. */
export function isoTimestampPreparoValido(iso: string | null | undefined): iso is string {
  if (!iso?.trim()) return false
  return Number.isFinite(Date.parse(iso))
}

/**
 * Null/vazio da API não apaga o que o cache já tem.
 * ISO válida da API substitui (fonte de verdade).
 */
export function escolherTimestampPreparo(
  incoming: string | null | undefined,
  existente: string | null | undefined
): string | null {
  if (isoTimestampPreparoValido(incoming)) return incoming.trim()
  if (isoTimestampPreparoValido(existente)) return existente.trim()
  return null
}
