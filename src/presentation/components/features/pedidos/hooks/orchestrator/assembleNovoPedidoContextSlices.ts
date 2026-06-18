import type { NovoPedidoContextValue } from '../../context/novoPedidoContextTypes'
import { buildNovoPedidoContextValue } from './buildNovoPedidoContextValue'

export type NovoPedidoContextSlices = {
  form?: Partial<NovoPedidoContextValue>
  ui?: Partial<NovoPedidoContextValue>
  detalhe?: Partial<NovoPedidoContextValue>
  actions?: Partial<NovoPedidoContextValue>
}

/** Monta o valor monolítico do provider a partir de fatias tipadas. */
export function assembleNovoPedidoContextSlices(
  slices: NovoPedidoContextSlices & Partial<NovoPedidoContextValue>
): NovoPedidoContextValue {
  const { form, ui, detalhe, actions, ...flat } = slices
  return buildNovoPedidoContextValue(form ?? {}, ui ?? {}, detalhe ?? {}, actions ?? {}, flat)
}
