import type { InvalidateOptions, InvalidateQueryFilters, QueryClient } from '@tanstack/react-query'
import { JIFFY_TENANT_QUERY_BROADCAST_CHANNEL } from '@/src/shared/constants/tenantQueryBroadcast'

export type TenantQueryInvalidateMessage = {
  type: 'invalidate'
  tabId: string
  queryKey: unknown[]
}

export function isTenantQueryInvalidateMessage(
  value: unknown
): value is TenantQueryInvalidateMessage {
  if (!value || typeof value !== 'object') return false
  const msg = value as TenantQueryInvalidateMessage
  return (
    msg.type === 'invalidate' &&
    typeof msg.tabId === 'string' &&
    msg.tabId.length > 0 &&
    Array.isArray(msg.queryKey) &&
    msg.queryKey.length > 0
  )
}

/**
 * Espelha `invalidateQueries` nas outras abas do mesmo origin.
 *
 * Padrão de cache do Gestor:
 * 1. Mutação grava no backend e chama `queryClient.invalidateQueries` (ou `useInvalidateTenantQueries`).
 * 2. Esta aba refaz as queries ativas.
 * 3. As outras abas recebem a mesma queryKey e invalidam o cache local.
 *
 * Cadastros usados em operação (entregador, taxa, cliente, produto) ainda devem
 * refetch ao abrir o select/painel — o cache de 5 min não pode esconder item novo.
 */
export function attachTenantQueryCrossTabSync(queryClient: QueryClient): () => void {
  if (typeof BroadcastChannel === 'undefined') {
    return () => undefined
  }

  const tabId = crypto.randomUUID()
  const channel = new BroadcastChannel(JIFFY_TENANT_QUERY_BROADCAST_CHANNEL)
  let applyingRemote = false

  const originalInvalidate = queryClient.invalidateQueries.bind(queryClient)

  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (!isTenantQueryInvalidateMessage(event.data)) return
    if (event.data.tabId === tabId) return

    applyingRemote = true
    try {
      void originalInvalidate({ queryKey: event.data.queryKey })
    } finally {
      applyingRemote = false
    }
  }

  queryClient.invalidateQueries = ((
    filters?: InvalidateQueryFilters,
    options?: InvalidateOptions
  ) => {
    const result = originalInvalidate(filters, options)
    if (!applyingRemote) {
      const queryKey = filters?.queryKey
      if (Array.isArray(queryKey) && queryKey.length > 0) {
        const message: TenantQueryInvalidateMessage = {
          type: 'invalidate',
          tabId,
          queryKey: [...queryKey],
        }
        channel.postMessage(message)
      }
    }
    return result
  }) as QueryClient['invalidateQueries']

  return () => {
    channel.close()
    queryClient.invalidateQueries = originalInvalidate
  }
}
