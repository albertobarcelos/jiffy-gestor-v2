'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import {
  buildTenantQueryKey,
  useInvalidateTenantQueries,
} from '@/src/presentation/hooks/useInvalidateTenantQueries'
import {
  buscarImpressorasLogicas,
  resolverEstacaoImpressaoConfig,
  type EstacaoImpressaoConfigResolvida,
  type ImpressoraLogica,
} from '@/src/infrastructure/api/estacoesImpressaoApi'

const STALE_MS = 1000 * 60 * 5

export function deliveryConfigImpressorasLogicasQueryKey(empresaId: string | null) {
  return buildTenantQueryKey(empresaId, ['delivery-config', 'impressoras-logicas'])
}

export function deliveryConfigEstacaoImpressaoQueryKey(empresaId: string | null) {
  return buildTenantQueryKey(empresaId, ['delivery-config', 'estacao-impressao'])
}

export function useDeliveryConfigImpressorasLogicas(enabled: boolean) {
  return useSecureTenantQuery<ImpressoraLogica[]>(
    ['delivery-config', 'impressoras-logicas'],
    ({ token }) => buscarImpressorasLogicas(token),
    {
      enabled,
      staleTime: STALE_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  )
}

export function useDeliveryConfigEstacaoImpressao(enabled: boolean) {
  return useSecureTenantQuery<EstacaoImpressaoConfigResolvida>(
    ['delivery-config', 'estacao-impressao'],
    ({ token }) => resolverEstacaoImpressaoConfig(token),
    {
      enabled,
      staleTime: STALE_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  )
}

/** Invalida cache de impressoras lógicas e estação ao salvar configurações delivery. */
export function useInvalidateDeliveryConfigImpressaoQueries() {
  const invalidate = useInvalidateTenantQueries()

  return () => {
    void invalidate(['delivery-config', 'impressoras-logicas'])
    void invalidate(['delivery-config', 'estacao-impressao'])
  }
}
