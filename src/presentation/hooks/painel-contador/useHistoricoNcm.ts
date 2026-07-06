'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'

export function useHistoricoNcm(ncm: string | null) {
  return useSecureTenantQuery(
    ['portal-contador', 'ncm-historico', ncm],
    async ({ token }) => {
      const { historicoNcm } = createPainelContadorUseCases(token)
      return historicoNcm.execute(ncm!)
    },
    { enabled: !!ncm }
  )
}
