'use client'

import { useCallback } from 'react'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'

export function usePainelContadorProgress() {
  const invalidate = useInvalidateTenantQueries()

  const query = useSecureTenantQuery(
    ['portal-contador', 'progresso'],
    async ({ token }) => {
      const { verificarProgresso } = createPainelContadorUseCases(token)
      return verificarProgresso.execute()
    },
    { staleTime: 30_000 }
  )

  const refetch = useCallback(() => {
    return invalidate(['portal-contador', 'progresso'])
  }, [invalidate])

  return { ...query, refetchProgresso: refetch }
}
