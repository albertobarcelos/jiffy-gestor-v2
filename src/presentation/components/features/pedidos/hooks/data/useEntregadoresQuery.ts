'use client'

import { listarEntregadoresDeliveryUseCase } from '@/src/application/use-cases/delivery/ListarEntregadoresDeliveryUseCase'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import type { UsuarioPdvEntregadorOption } from '../../types'

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
      staleTime: 1000 * 60 * 5,
      retry: 1,
    }
  )

  return {
    entregadores: query.data ?? [],
    isLoadingEntregadores: query.isLoading,
    entregadoresQuery: query,
  }
}
