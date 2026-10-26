'use client'

import { useCallback, useMemo } from 'react'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { requireGestorConfig } from '@/src/infrastructure/api/gestorConfigRequest'
import {
  listarEntregadoresDeliveryPagina,
  listarMeiosPagamentoPagina,
} from '@/src/infrastructure/api/deliveryConfigApi'
import { listarImpressorasPagina } from '@/src/infrastructure/api/terminaisConfigApi'
import {
  contarItensListaHub,
  type DeliveryHubPassosExtras,
} from '@/src/presentation/components/features/delivery/hub/deliveryHubCadastros'

export const HUB_ENTREGADORES_COUNT_QUERY_KEY = ['delivery', 'hub', 'entregadores-count'] as const
export const HUB_MEIOS_COUNT_QUERY_KEY = ['delivery', 'hub', 'meios-count'] as const
export const HUB_IMPRESSORAS_COUNT_QUERY_KEY = ['delivery', 'hub', 'impressoras-count'] as const

export function useDeliveryHubCadastrosRecomendados(enabled: boolean) {
  const entregadoresQuery = useSecureTenantQuery<number>(
    HUB_ENTREGADORES_COUNT_QUERY_KEY,
    async ({ token }) =>
      contarItensListaHub(
        requireGestorConfig(
          await listarEntregadoresDeliveryPagina(token, { limit: 1, offset: 0 })
        )
      ),
    { enabled, staleTime: 1000 * 15, refetchOnWindowFocus: false, retry: 1 }
  )
  const meiosQuery = useSecureTenantQuery<number>(
    HUB_MEIOS_COUNT_QUERY_KEY,
    async ({ token }) =>
      contarItensListaHub(
        requireGestorConfig(await listarMeiosPagamentoPagina(token, { limit: 1, offset: 0 }))
      ),
    { enabled, staleTime: 1000 * 15, refetchOnWindowFocus: false, retry: 1 }
  )
  const impressorasQuery = useSecureTenantQuery<number>(
    HUB_IMPRESSORAS_COUNT_QUERY_KEY,
    async ({ token }) =>
      contarItensListaHub(
        requireGestorConfig(await listarImpressorasPagina(token, { limit: 1, offset: 0 }))
      ),
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
