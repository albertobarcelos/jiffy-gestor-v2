import type { QueryClient } from '@tanstack/react-query'

/** Prefixo das queries infinitas do Kanban balcão (global legado + por coluna). */
export const KANBAN_VENDAS_UNIFICADAS_QUERY_KEY = ['vendas-unificadas'] as const

/** Prefixo do infinite query do Kanban em modo delivery (`usePedidosDeliveryInfinite`). */
export const KANBAN_PEDIDOS_DELIVERY_INFINITE_QUERY_KEY = ['delivery', 'pedidos', 'infinite'] as const

/**
 * Invalida caches de listagem do Kanban fiscal (unificado + delivery).
 * Usar após mutações que alteram pedidos exibidos no quadro.
 */
export function invalidateKanbanVendasListagens(
  queryClient: QueryClient,
  options?: { refetchType?: 'active' | 'all' | 'none' }
): void {
  const refetchType = options?.refetchType
  void queryClient.invalidateQueries({
    queryKey: KANBAN_VENDAS_UNIFICADAS_QUERY_KEY,
    refetchType,
  })
  void queryClient.invalidateQueries({
    queryKey: KANBAN_PEDIDOS_DELIVERY_INFINITE_QUERY_KEY,
    refetchType,
  })
}

/** Refetch explícito das listagens infinitas do Kanban (após emissão/reemissão fiscal). */
export async function refetchKanbanVendasListagens(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.refetchQueries({ queryKey: KANBAN_VENDAS_UNIFICADAS_QUERY_KEY }),
    queryClient.refetchQueries({ queryKey: KANBAN_PEDIDOS_DELIVERY_INFINITE_QUERY_KEY }),
  ])
}
