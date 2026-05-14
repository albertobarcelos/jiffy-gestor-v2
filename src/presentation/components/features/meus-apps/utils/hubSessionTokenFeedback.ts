/** Mensagem alinhada ao BFF (`validateRequest`) e ao hub. */
export const HUB_SESSAO_TOKEN_MENSAGEM =
  'Token inválido ou expirado'

export function isLikelyHubSessionTokenError(message: string): boolean {
  const m = message.trim().toLowerCase()
  if (!m) return false
  return (
    m.includes('token inválido') ||
    m.includes('token invalido') ||
    m.includes('token não encontrado') ||
    (m.includes('token') && (m.includes('expir') || m.includes('inválido') || m.includes('invalido'))) ||
    m.includes('sessão expirada') ||
    m.includes('sessao expirada')
  )
}
