'use client'

import type { QueryClient } from '@tanstack/react-query'
import { listarEntregadoresDeliveryUseCase } from '@/src/infrastructure/composition/pedidoUseCases'
import { HUB_ENTREGADORES_COUNT_QUERY_KEY } from '@/src/presentation/hooks/useDeliveryHubCadastrosRecomendados'
import { buildTenantQueryKey } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import type { UsuarioPdvEntregadorOption } from '../../types'

export const ENTREGADORES_DELIVERY_QUERY_KEY = ['delivery-entregadores'] as const

export function invalidarQueriesEntregadores(
  queryClient: QueryClient,
  empresaId: string | null
): void {
  void queryClient.invalidateQueries({
    queryKey: buildTenantQueryKey(empresaId, ENTREGADORES_DELIVERY_QUERY_KEY),
  })
  void queryClient.invalidateQueries({
    queryKey: buildTenantQueryKey(empresaId, HUB_ENTREGADORES_COUNT_QUERY_KEY),
  })
}

export type UseEntregadoresQueryParams = {
  enabled: boolean
  token: string | undefined
}

export function useEntregadoresQuery({ enabled, token }: UseEntregadoresQueryParams) {
  const query = useSecureTenantQuery(
    ['delivery-entregadores', { ativo: true }],
    async ({ token: tenantToken }): Promise<UsuarioPdvEntregadorOption[]> => {
      return listarEntregadoresDeliveryUseCase.execute(tenantToken)
    },
    {
      enabled: enabled && !!token,
      staleTime: 0,
      refetchOnMount: 'always',
      retry: 1,
    }
  )

  return {
    entregadores: query.data ?? [],
    isLoadingEntregadores: query.isLoading,
    entregadoresQuery: query,
  }
}
