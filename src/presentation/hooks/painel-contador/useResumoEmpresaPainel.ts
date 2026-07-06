'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'

export function useResumoEmpresaPainel() {
  return useSecureTenantQuery(
    ['portal-contador', 'resumo'],
    async ({ token }) => {
      const { carregarResumo } = createPainelContadorUseCases(token)
      return carregarResumo.execute()
    },
    { staleTime: 60_000 }
  )
}
