/**
 * Política: validade do token de cotação pública.
 * `nowMs` injetável para testes.
 */
export const MARGEM_RENOVACAO_TOKEN_COTACAO_MS = 90_000

export function isTokenCotacaoExpirado(
  expiresAt: string,
  nowMs: number = Date.now()
): boolean {
  const ts = Date.parse(expiresAt)
  if (Number.isNaN(ts)) return true
  return ts <= nowMs
}

/** Vencido ou dentro da margem — dá tempo de renovar antes do clique em enviar. */
export function tokenCotacaoPertoDeVencer(
  expiresAt: string,
  nowMs: number = Date.now(),
  margemMs: number = MARGEM_RENOVACAO_TOKEN_COTACAO_MS
): boolean {
  const ts = Date.parse(expiresAt)
  if (Number.isNaN(ts)) return true
  return ts - nowMs <= margemMs
}
