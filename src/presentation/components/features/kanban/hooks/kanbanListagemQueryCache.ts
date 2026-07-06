import type { QueryClient, Query } from '@tanstack/react-query'

/**
 * Segmentos da key de vendas unificadas no padrão multi-tenant:
 * `['tenant', empresaId, 'vendas-unificadas', 'infinite', ...]`
 */
export const KANBAN_VENDAS_UNIFICADAS_INFINITE_SEGMENTS = [
  'vendas-unificadas',
  'infinite',
] as const

export function isKanbanVendasUnificadasInfiniteQueryKey(
  queryKey: readonly unknown[]
): boolean {
  return (
    Array.isArray(queryKey) &&
    queryKey[0] === 'tenant' &&
    queryKey[2] === 'vendas-unificadas' &&
    queryKey[3] === 'infinite'
  )
}

export function kanbanVendasUnificadasInfiniteQueryFilter() {
  return {
    predicate: (query: Query) => isKanbanVendasUnificadasInfiniteQueryKey(query.queryKey),
  }
}

/**
 * Segmentos da key de pedidos delivery no padrão multi-tenant:
 * `['tenant', empresaId, 'delivery', 'pedidos', 'infinite', ...]`
 */
export const KANBAN_PEDIDOS_DELIVERY_INFINITE_SEGMENTS = [
  'delivery',
  'pedidos',
  'infinite',
] as const

export function isKanbanPedidosDeliveryInfiniteQueryKey(
  queryKey: readonly unknown[]
): boolean {
  return (
    Array.isArray(queryKey) &&
    queryKey[0] === 'tenant' &&
    queryKey[2] === 'delivery' &&
    queryKey[3] === 'pedidos' &&
    queryKey[4] === 'infinite'
  )
}

export function kanbanPedidosDeliveryInfiniteQueryFilter() {
  return {
    predicate: (query: Query) => isKanbanPedidosDeliveryInfiniteQueryKey(query.queryKey),
  }
}

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
    ...kanbanVendasUnificadasInfiniteQueryFilter(),
    refetchType,
  })
  void queryClient.invalidateQueries({
    ...kanbanPedidosDeliveryInfiniteQueryFilter(),
    refetchType,
  })
}

/** Refetch explícito das listagens infinitas do Kanban (após emissão/reemissão fiscal). */
export async function refetchKanbanVendasListagens(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.refetchQueries(kanbanVendasUnificadasInfiniteQueryFilter()),
    queryClient.refetchQueries(kanbanPedidosDeliveryInfiniteQueryFilter()),
  ])
}
