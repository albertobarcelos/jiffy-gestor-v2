import { normalizarSlugPublico } from '@/src/application/delivery-publico/normalizarSlugPublico'

/** Prefixo das rotas públicas de pedido (delivery).
 * Em jiffy-cardapio as rotas são raiz: /{slug}, /{slug}/carrinho, /{slug}/pedido/{codigo}, /instrucoes
 */
export const DELIVERY_PUBLICO_BASE = ''

function segmentoSlug(slug: string): string {
  return encodeURIComponent(normalizarSlugPublico(slug) || slug.trim())
}

export function deliveryPublicoHomePath(slug: string): string {
  return `/${segmentoSlug(slug)}`
}

export function deliveryPublicoCarrinhoPath(slug: string): string {
  return `/${segmentoSlug(slug)}/carrinho`
}

export function deliveryPublicoPedidoPath(slug: string, codigo: string): string {
  return `/${segmentoSlug(slug)}/pedido/${encodeURIComponent(codigo)}`
}

export function deliveryPublicoInstrucoesPath(): string {
  return `/instrucoes`
}
