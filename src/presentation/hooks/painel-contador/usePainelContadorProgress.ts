'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'

export function usePainelContadorProgress() {
  const { auth, isRehydrated, isAuthenticated } = useAuthStore()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  const query = useQuery({
    queryKey: ['portal-contador', 'progresso', empresaId],
    enabled: isRehydrated && isAuthenticated && !!token,
    queryFn: async () => {
      const { verificarProgresso } = createPainelContadorUseCases(token!)
      return verificarProgresso.execute()
    },
    staleTime: 30_000,
  })

  const refetch = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ['portal-contador', 'progresso', empresaId] })
  }, [queryClient, empresaId])

  return { ...query, refetchProgresso: refetch }
}
