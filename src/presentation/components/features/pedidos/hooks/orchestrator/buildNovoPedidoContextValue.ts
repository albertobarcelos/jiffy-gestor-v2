import type { NovoPedidoContextValue } from '../../context/novoPedidoContextTypes'

/** Mescla fatias parciais no valor do context monolítico (compatível com providers divididos). */
export function buildNovoPedidoContextValue(
  ...slices: Array<Partial<NovoPedidoContextValue>>
): NovoPedidoContextValue {
  return Object.assign({}, ...slices) as NovoPedidoContextValue
}
