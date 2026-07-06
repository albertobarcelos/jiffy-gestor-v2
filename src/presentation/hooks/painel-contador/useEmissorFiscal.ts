'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'

export function useEmissorFiscal() {
  const invalidate = useInvalidateTenantQueries()

  const emissaoQuery = useSecureTenantQuery(
    ['portal-contador', 'emissao'],
    async ({ token }) => {
      const { salvarEmissao } = createPainelContadorUseCases(token)
      return salvarEmissao.listar()
    }
  )

  const salvarMutation = useSecureTenantMutation(
    async ({ token }, { modelo, input }: { modelo: 55 | 65; input: unknown }) => {
      const { salvarEmissao } = createPainelContadorUseCases(token)
      return salvarEmissao.salvar(modelo, input)
    },
    {
      onSuccess: async () => {
        showToast.success('Configuração salva com sucesso')
        await invalidate(['portal-contador', 'emissao'])
        await invalidate(['portal-contador', 'progresso'])
      },
      onError: (e: Error) => showToast.error(e.message),
    }
  )

  return { emissaoQuery, salvarMutation }
}
