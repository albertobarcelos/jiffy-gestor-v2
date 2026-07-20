/** Prefixo das rotas públicas de pedido (delivery). */
export const DELIVERY_PUBLICO_BASE = '/delivery'

export function deliveryPublicoHomePath(slug: string): string {
  return `${DELIVERY_PUBLICO_BASE}/${encodeURIComponent(slug)}`
}

export function deliveryPublicoCarrinhoPath(slug: string): string {
  return `${deliveryPublicoHomePath(slug)}/carrinho`
}

export function deliveryPublicoInstrucoesPath(): string {
  return `${DELIVERY_PUBLICO_BASE}/instrucoes`
}
