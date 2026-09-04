/**
 * Canal do pedido no Cardápio (app do consumidor).
 * Independente de `origem: JIFFY_DELIVERY` (quem criou o pedido).
 *
 * @see docs/CARDAPIO_CANAL_CONTRATO.md
 */
export const CANAIS_PEDIDO_CARDAPIO = ['entrega', 'retirada', 'mesa', 'comanda'] as const

export type CanalPedidoCardapio = (typeof CANAIS_PEDIDO_CARDAPIO)[number]

/** Canais já suportados pelo checkout atual. */
export const CANAIS_PEDIDO_CARDAPIO_ATIVOS = ['entrega', 'retirada'] as const

export type CanalPedidoCardapioAtivo = (typeof CANAIS_PEDIDO_CARDAPIO_ATIVOS)[number]

export function isCanalPedidoCardapio(value: string): value is CanalPedidoCardapio {
  return (CANAIS_PEDIDO_CARDAPIO as readonly string[]).includes(value)
}

/** Enquanto mesa/comanda não existem na UI, canal = tipoEntrega. */
export function canalFromTipoEntrega(
  tipoEntrega: 'entrega' | 'retirada'
): CanalPedidoCardapioAtivo {
  return tipoEntrega
}
