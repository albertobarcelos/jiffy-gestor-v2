/**
 * Campos de cardápio em `parametroEmpresa` (`GET/PATCH /empresas`).
 * Backend: `menuDeliveryId` e `menuVendaGestorId`.
 */
export type CampoMenuParametroEmpresa = 'menuDeliveryId' | 'menuVendaGestorId'

const ALIAS_MENU_VENDA_GESTOR = 'menuVendasGestorId'

export function lerMenuIdDeParametroEmpresa(
  parametroEmpresa: Record<string, unknown> | null | undefined,
  campo: CampoMenuParametroEmpresa
): string | null {
  if (!parametroEmpresa) return null

  const raw = parametroEmpresa[campo]
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed.length > 0) return trimmed
  }

  if (campo === 'menuVendaGestorId') {
    const alias = parametroEmpresa[ALIAS_MENU_VENDA_GESTOR]
    if (typeof alias === 'string') {
      const trimmed = alias.trim()
      if (trimmed.length > 0) return trimmed
    }
  }

  return null
}

export function patchMenuIdEmParametroEmpresa(
  parametroAtual: Record<string, unknown>,
  campo: CampoMenuParametroEmpresa,
  menuId: string | null
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...parametroAtual,
    [campo]: menuId,
  }
  if (campo === 'menuVendaGestorId') {
    delete next[ALIAS_MENU_VENDA_GESTOR]
  }
  return next
}

/** @deprecated Preferir `patchMenuIdEmParametroEmpresa(..., 'menuDeliveryId', ...)`. */
export function montarParametroEmpresaComMenuDelivery(
  parametroAtual: Record<string, unknown>,
  menuDeliveryId: string | null
): Record<string, unknown> {
  return patchMenuIdEmParametroEmpresa(parametroAtual, 'menuDeliveryId', menuDeliveryId)
}
