/**
 * Política: validade do token de cotação pública.
 * `nowMs` injetável para testes.
 */
export function isTokenCotacaoExpirado(
  expiresAt: string,
  nowMs: number = Date.now()
): boolean {
  const ts = Date.parse(expiresAt)
  if (Number.isNaN(ts)) return true
  return ts <= nowMs
}
