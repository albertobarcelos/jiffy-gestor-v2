import type { StatusVenda } from '@/src/domain/types/pedido'

/**
 * Pedidos delivery nascem abertos (triagem / Novos Pedidos no Kanban).
 * Balcão nasce finalizado, pois não possui mais o passo Informações.
 */
export function statusPadraoNovoPedido(tipoInicio: 'balcao' | 'delivery'): StatusVenda {
  return tipoInicio === 'delivery' ? 'ABERTA' : 'FINALIZADA'
}
