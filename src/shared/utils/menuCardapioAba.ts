export const MENU_CARDAPIO_ABAS = ['produtos', 'categorias', 'complementos'] as const

export type MenuCardapioAba = (typeof MENU_CARDAPIO_ABAS)[number]

export function menuCardapioPath(menuId: string, aba: MenuCardapioAba = 'produtos'): string {
  const id = menuId.trim()
  if (!id) return '/cardapio'
  if (aba === 'categorias') return `/menus/${id}/categorias`
  if (aba === 'complementos') return `/menus/${id}/complementos`
  return `/menus/${id}`
}

/** Pathname já sem `/gestao/{slug}` (ex.: `/menus/abc/categorias`). */
export function resolverMenuCardapioAba(modulePath: string): MenuCardapioAba {
  const path = modulePath.split('?')[0] ?? ''
  if (/\/menus\/[^/]+\/categorias\/?$/.test(path)) return 'categorias'
  if (/\/menus\/[^/]+\/complementos\/?$/.test(path)) return 'complementos'
  return 'produtos'
}
