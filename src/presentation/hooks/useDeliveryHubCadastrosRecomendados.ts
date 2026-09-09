'use client'

import { useCallback, useMemo } from 'react'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import {
  contarItensListaHub,
  type DeliveryHubPassosExtras,
} from '@/src/presentation/components/features/delivery/hub/deliveryHubCadastros'

export const HUB_ENTREGADORES_COUNT_QUERY_KEY = ['delivery', 'hub', 'entregadores-count'] as const
export const HUB_MEIOS_COUNT_QUERY_KEY = ['delivery', 'hub', 'meios-count'] as const
export const HUB_IMPRESSORAS_COUNT_QUERY_KEY = ['delivery', 'hub', 'impressoras-count'] as const

async function buscarContagemLista(token: string, path: string): Promise<number> {
  const res = await fetchGestorApi(path, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Erro HTTP ${res.status}`)
  }
  const raw: unknown = await res.json().catch(() => ({}))
  return contarItensListaHub(raw)
}

export function useDeliveryHubCadastrosRecomendados(enabled: boolean) {
  const entregadoresQuery = useSecureTenantQuery<number>(
    HUB_ENTREGADORES_COUNT_QUERY_KEY,
    ({ token }) => buscarContagemLista(token, '/api/delivery/entregadores?limit=1&offset=0'),
    { enabled, staleTime: 1000 * 15, refetchOnWindowFocus: false, retry: 1 }
  )
  const meiosQuery = useSecureTenantQuery<number>(
    HUB_MEIOS_COUNT_QUERY_KEY,
    ({ token }) => buscarContagemLista(token, '/api/meios-pagamentos?limit=1&offset=0'),
    { enabled, staleTime: 1000 * 15, refetchOnWindowFocus: false, retry: 1 }
  )
  const impressorasQuery = useSecureTenantQuery<number>(
    HUB_IMPRESSORAS_COUNT_QUERY_KEY,
    ({ token }) => buscarContagemLista(token, '/api/impressoras?limit=1&offset=0'),
    { enabled, staleTime: 1000 * 15, refetchOnWindowFocus: false, retry: 1 }
  )

  const extras: DeliveryHubPassosExtras = useMemo(
    () => ({
      qtdEntregadores: entregadoresQuery.data ?? 0,
      qtdMeiosPagamento: meiosQuery.data ?? 0,
      qtdImpressoras: impressorasQuery.data ?? 0,
    }),
    [entregadoresQuery.data, meiosQuery.data, impressorasQuery.data]
  )

  const refetchEntregadores = entregadoresQuery.refetch
  const refetchMeios = meiosQuery.refetch
  const refetchImpressoras = impressorasQuery.refetch

  const refetch = useCallback(() => {
    void refetchEntregadores()
    void refetchMeios()
    void refetchImpressoras()
  }, [refetchEntregadores, refetchMeios, refetchImpressoras])

  return { extras, refetch }
}
