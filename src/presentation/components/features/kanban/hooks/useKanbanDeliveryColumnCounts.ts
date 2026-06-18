'use client'

import { useQueries } from '@tanstack/react-query'
import type { StatusDeliveryApi } from '@/src/application/dto/api/pedidoDeliveryApi'
import type { ColunaKanbanId } from '../types'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import {
  fetchPedidosDeliveryPagina,
  pedidosDeliveryInfiniteQueryKey,
  type PedidosDeliveryInfiniteParams,
} from './usePedidosDeliveryInfinite'

/** Colunas operacionais delivery ↔ status na API. */
const STATUS_DELIVERY_POR_COLUNA: Partial<Record<ColunaKanbanId, StatusDeliveryApi>> = {
  NOVOS_PEDIDOS: 'PENDENTE',
  EM_PREPARO: 'EM_PREPARO',
  PRONTO_ENTREGA: 'PRONTO',
  EM_ROTA: 'EM_ROTA',
  FINALIZADAS: 'FINALIZADO',
}

/**
 * Total por coluna via `count` da API (limit=1), sem carregar todos os cards.
 * Usado no modo delivery para o número no cabeçalho da coluna.
 */
export function useKanbanDeliveryColumnCounts(
  params: PedidosDeliveryInfiniteParams,
  columnIds: ColunaKanbanId[],
  enabled: boolean
): Record<string, number> {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const baseKey = pedidosDeliveryInfiniteQueryKey(params, empresaId)

  const queries = useQueries({
    queries: columnIds
      .map(columnId => {
        const statusDelivery = STATUS_DELIVERY_POR_COLUNA[columnId]
        if (!statusDelivery) return null
        return {
          queryKey: [...baseKey, 'column-count', columnId, statusDelivery],
          queryFn: () =>
            fetchPedidosDeliveryPagina(
              { ...params, statusDelivery },
              0,
              1,
              token!
            ),
          enabled: enabled && !!token,
          staleTime: 30_000,
          gcTime: 5 * 60_000,
        }
      })
      .filter((q): q is NonNullable<typeof q> => q != null),
  })

  const counts: Record<string, number> = {}
  let queryIdx = 0
  for (const columnId of columnIds) {
    if (!STATUS_DELIVERY_POR_COLUNA[columnId]) continue
    const result = queries[queryIdx]
    queryIdx += 1
    if (result?.data?.count != null) {
      counts[columnId] = result.data.count
    }
  }
  return counts
}
