/**
 * Campos de cardápio em `parametroEmpresa` (`GET/PATCH /empresas`).
 * Homolog: `menuDeliveryId` e `menuVendaGestorId`.
 */
export type CampoMenuParametroEmpresa = 'menuDeliveryId' | 'menuVendaGestorId'

export function lerMenuIdDeParametroEmpresa(
  parametroEmpresa: Record<string, unknown> | null | undefined,
  campo: CampoMenuParametroEmpresa
): string | null {
  if (!parametroEmpresa) return null
  const raw = parametroEmpresa[campo]
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function montarParametroEmpresaComMenuDelivery(
  parametroAtual: Record<string, unknown>,
  menuDeliveryId: string | null
): Record<string, unknown> {
  return {
    ...parametroAtual,
    menuDeliveryId,
  }
}
