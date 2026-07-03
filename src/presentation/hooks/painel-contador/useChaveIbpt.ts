'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'

export function useChaveIbpt() {
  const invalidate = useInvalidateTenantQueries()

  const statusQuery = useSecureTenantQuery(
    ['portal-contador', 'ibpt'],
    async ({ token }) => {
      const { chaveIbpt } = createPainelContadorUseCases(token)
      return chaveIbpt.getStatus()
    }
  )

  const salvarMutation = useSecureTenantMutation(
    async ({ token }, chave: string) => {
      const { chaveIbpt } = createPainelContadorUseCases(token)
      return chaveIbpt.salvar(chave)
    },
    {
      onSuccess: async () => {
        showToast.success('Chave IBPT salva com sucesso')
        await invalidate(['portal-contador', 'ibpt'])
        await invalidate(['portal-contador', 'progresso'])
      },
      onError: (e: Error) => showToast.error(e.message),
    }
  )

  const removerMutation = useSecureTenantMutation(
    async ({ token }) => {
      const { chaveIbpt } = createPainelContadorUseCases(token)
      return chaveIbpt.remover()
    },
    {
      onSuccess: async () => {
        showToast.success('Chave IBPT removida')
        await invalidate(['portal-contador', 'ibpt'])
        await invalidate(['portal-contador', 'progresso'])
      },
      onError: (e: Error) => showToast.error(e.message),
    }
  )

  return { statusQuery, salvarMutation, removerMutation }
}
