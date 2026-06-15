'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'

export function useResumoEmpresaPainel() {
  const { auth, isRehydrated, isAuthenticated } = useAuthStore()
  const empresaId = useTenantEmpresaId()
  const token = auth?.getAccessToken()

  return useQuery({
    queryKey: ['portal-contador', 'resumo', empresaId],
    enabled: isRehydrated && isAuthenticated && !!token,
    queryFn: async () => {
      const { carregarResumo } = createPainelContadorUseCases(token!)
      return carregarResumo.execute()
    },
    staleTime: 60_000,
  })
}
