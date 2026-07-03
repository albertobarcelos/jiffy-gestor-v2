'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'

export function useReformaTributaria() {
  const invalidate = useInvalidateTenantQueries()

  const listQuery = useSecureTenantQuery(
    ['portal-contador', 'reforma-tributaria'],
    async ({ token }) => {
      const { listarReforma } = createPainelContadorUseCases(token)
      return listarReforma.execute()
    }
  )

  const salvarMutation = useSecureTenantMutation(
    async (
      { token },
      {
        ncm,
        input,
      }: {
        ncm: string
        input: { cst: string; codigoClassificacaoFiscal: string }
      }
    ) => {
      const { salvarReforma } = createPainelContadorUseCases(token)
      return salvarReforma.execute(ncm, input)
    },
    {
      onSuccess: async () => {
        showToast.success('Reforma tributária salva')
        await invalidate(['portal-contador', 'reforma-tributaria'])
      },
      onError: (e: Error) => showToast.error(e.message),
    }
  )

  return { listQuery, salvarMutation }
}
