function str(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

export function lerMenuDeliveryIdDeParametroDelivery(
  parametroDelivery: Record<string, unknown> | null | undefined
): string | null {
  if (!parametroDelivery) return null
  return str(parametroDelivery.menuDeliveryId ?? parametroDelivery.menu_delivery_id)
}

/**
 * Extrai o menu publicado no delivery.
 * Fonte canônica: `parametroDelivery` em `GET /api/delivery/empresas/me`.
 * Fallback legado: `parametroEmpresa.menuDeliveryId` em `GET /api/empresas/me`.
 */
export function parseMenuDeliveryId(data: Record<string, unknown>): string | null {
  const paramDelivery = (data.parametroDelivery ?? data.parametro_delivery) as
    | Record<string, unknown>
    | undefined
  const fromDelivery = lerMenuDeliveryIdDeParametroDelivery(paramDelivery)
  if (fromDelivery) return fromDelivery

  const paramEmpresa = (data.parametroEmpresa ?? data.parametro_empresa) as
    | Record<string, unknown>
    | undefined
  if (!paramEmpresa) return null

  return str(paramEmpresa.menuDeliveryId ?? paramEmpresa.menu_delivery_id)
}
