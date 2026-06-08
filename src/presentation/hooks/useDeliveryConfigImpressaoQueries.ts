'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId, useTenantQueryKey } from '@/src/presentation/hooks/useTenantQueryKey'
import {
  buscarImpressorasLogicas,
  resolverEstacaoImpressaoConfig,
  type EstacaoImpressaoConfigResolvida,
  type ImpressoraLogica,
} from '@/src/infrastructure/api/estacoesImpressaoApi'

const STALE_MS = 1000 * 60 * 5

export function deliveryConfigImpressorasLogicasQueryKey(empresaId: string | null) {
  return ['tenant', empresaId, 'delivery-config', 'impressoras-logicas'] as const
}

export function deliveryConfigEstacaoImpressaoQueryKey(empresaId: string | null) {
  return ['tenant', empresaId, 'delivery-config', 'estacao-impressao'] as const
}

export function useDeliveryConfigImpressorasLogicas(enabled: boolean) {
  const { auth, isAuthenticated, isRehydrated } = useAuthStore()
  const token = auth?.getAccessToken()
  const queryKey = useTenantQueryKey(['delivery-config', 'impressoras-logicas'])

  return useQuery<ImpressoraLogica[]>({
    queryKey,
    queryFn: () => buscarImpressorasLogicas(token!),
    enabled: enabled && isRehydrated && isAuthenticated && !!token,
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useDeliveryConfigEstacaoImpressao(enabled: boolean) {
  const { auth, isAuthenticated, isRehydrated } = useAuthStore()
  const token = auth?.getAccessToken()
  const queryKey = useTenantQueryKey(['delivery-config', 'estacao-impressao'])

  return useQuery<EstacaoImpressaoConfigResolvida>({
    queryKey,
    queryFn: () => resolverEstacaoImpressaoConfig(token!),
    enabled: enabled && isRehydrated && isAuthenticated && !!token,
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

/** Invalida cache de impressoras lógicas e estação ao salvar configurações delivery. */
export function useInvalidateDeliveryConfigImpressaoQueries() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return () => {
    void queryClient.invalidateQueries({
      queryKey: deliveryConfigImpressorasLogicasQueryKey(empresaId),
    })
    void queryClient.invalidateQueries({
      queryKey: deliveryConfigEstacaoImpressaoQueryKey(empresaId),
    })
  }
}
