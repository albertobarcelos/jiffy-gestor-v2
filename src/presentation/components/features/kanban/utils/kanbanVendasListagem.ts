import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type { Venda } from '../types'

/** Separa vendas unificadas pelo modo ativo do quadro (delivery vs balcão). */
export function filtrarVendasKanbanPorModo(vendas: Venda[], modo: ModoKanbanVendas): Venda[] {
  if (modo === 'delivery') {
    return vendas.filter(venda => venda.isPedidoEntregaGestor())
  }
  return vendas.filter(venda => !venda.isPedidoEntregaGestor())
}

/** Intervalo de polling da listagem enquanto o Kanban está aberto (multi-estação). */
export const KANBAN_VENDAS_REFETCH_INTERVAL_MS = 60_000
