/** Prefixo das rotas públicas de pedido (delivery).
 * Em jiffy-cardapio as rotas são raiz: /{slug}, /{slug}/carrinho, /instrucoes
 */
export const DELIVERY_PUBLICO_BASE = ''

export function deliveryPublicoHomePath(slug: string): string {
  return `/${encodeURIComponent(slug)}`
}

export function deliveryPublicoCarrinhoPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/carrinho`
}

export function deliveryPublicoInstrucoesPath(): string {
  return `/instrucoes`
}
