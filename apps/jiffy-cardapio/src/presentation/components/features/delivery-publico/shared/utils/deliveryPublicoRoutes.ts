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

/** QR / tablet na mesa — mesmo cardápio, canal `mesa`. */
export function deliveryPublicoMesaPath(slug: string, mesaId: string): string {
  return `/${encodeURIComponent(slug)}/mesa/${encodeURIComponent(mesaId)}`
}

/** Comanda — mesmo cardápio, canal `comanda`. */
export function deliveryPublicoComandaPath(slug: string, codigo: string): string {
  return `/${encodeURIComponent(slug)}/comanda/${encodeURIComponent(codigo)}`
}

/** Tablet na mesa (kiosk): mesma rota de mesa + flag de superfície. */
export function deliveryPublicoTabletMesaPath(slug: string, mesaId: string): string {
  return `${deliveryPublicoMesaPath(slug, mesaId)}?tablet=1`
}
