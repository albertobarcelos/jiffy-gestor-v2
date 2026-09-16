/** Prefixo das rotas públicas de pedido (delivery).
 * Em jiffy-cardapio as rotas são raiz: /{slug}, /{slug}/carrinho, /{slug}/pedido/{codigo}, /instrucoes
 */
export const DELIVERY_PUBLICO_BASE = ''

export function deliveryPublicoHomePath(slug: string): string {
  return `/${encodeURIComponent(slug)}`
}

export function deliveryPublicoCarrinhoPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/carrinho`
}

export function deliveryPublicoPedidoPath(slug: string, codigo: string): string {
  return `/${encodeURIComponent(slug)}/pedido/${encodeURIComponent(codigo)}`
}

export function deliveryPublicoInstrucoesPath(): string {
  return `/instrucoes`
}
