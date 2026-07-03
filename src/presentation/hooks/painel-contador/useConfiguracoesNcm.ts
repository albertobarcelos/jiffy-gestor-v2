'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'

export function useConfiguracoesNcm() {
  const invalidate = useInvalidateTenantQueries()

  const ncmsQuery = useSecureTenantQuery(
    ['portal-contador', 'ncms'],
    async ({ token }) => {
      const { listarNcms } = createPainelContadorUseCases(token)
      return listarNcms.execute()
    }
  )

  const salvarMutation = useSecureTenantMutation(
    async ({ token }, { ncm, input }: { ncm: string; input: unknown }) => {
      const { salvarNcm } = createPainelContadorUseCases(token)
      return salvarNcm.execute(ncm, input)
    },
    {
      onSuccess: async () => {
        showToast.success('Configuração NCM salva')
        await invalidate(['portal-contador', 'ncms'])
        await invalidate(['portal-contador', 'progresso'])
      },
      onError: (e: Error) => showToast.error(e.message),
    }
  )

  const copiarMutation = useSecureTenantMutation(
    async ({ token }, { ncm, input }: { ncm: string; input: unknown }) => {
      const { copiarNcm } = createPainelContadorUseCases(token)
      return copiarNcm.execute(ncm, input)
    },
    {
      onSuccess: async () => {
        showToast.success('Configuração copiada')
        await invalidate(['portal-contador', 'ncms'])
      },
      onError: (e: Error) => showToast.error(e.message),
    }
  )

  return { ncmsQuery, salvarMutation, copiarMutation }
}
