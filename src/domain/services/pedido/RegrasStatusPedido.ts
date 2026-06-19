import type { StatusVenda } from '@/src/domain/types/pedido'

/**
 * Pedidos entrega devem nascer abertos (triagem / Novos Pedidos no Kanban).
 * Balcão nasce finalizado, pois não possui mais o passo Informações.
 */
export function statusPadraoNovoPedido(tipoInicio: 'balcao' | 'entrega'): StatusVenda {
  return tipoInicio === 'entrega' ? 'ABERTA' : 'FINALIZADA'
}
