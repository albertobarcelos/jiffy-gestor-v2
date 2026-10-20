export const PEDIDO_CATALOGO_GRADE_CLASS =
  'grid min-h-0 flex-1 grid-cols-2 content-start gap-1.5 rounded-lg border p-1.5 sm:grid-cols-3 lg:grid-cols-4'

export const COR_HEX_GRUPO_CATALOGO_PADRAO = '#6b7280'

export type LayoutCatalogoProdutoPedido = 'foto' | 'quadradinho'

export function resolverLayoutCatalogoProdutoPedido(
  imagemUrl: string | null | undefined,
  imagemFalhou = false
): LayoutCatalogoProdutoPedido {
  const url = imagemUrl?.trim()
  return url && !imagemFalhou ? 'foto' : 'quadradinho'
}
