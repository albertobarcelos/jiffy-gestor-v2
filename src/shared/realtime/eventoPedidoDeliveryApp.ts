export const EVENTO_PEDIDO_DELIVERY_APP = 'jiffy:pedido-delivery-app'

export function emitirPedidoDeliveryApp(payload: unknown): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENTO_PEDIDO_DELIVERY_APP, { detail: payload }))
}
