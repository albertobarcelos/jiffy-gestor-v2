'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'

export function useCertificadoDigital() {
  const invalidate = useInvalidateTenantQueries()

  const certificadoQuery = useSecureTenantQuery(
    ['portal-contador', 'certificado'],
    async ({ token }) => {
      const { certificado } = createPainelContadorUseCases(token)
      return certificado.getCertificado()
    }
  )

  const dadosCompletosQuery = useSecureTenantQuery(
    ['portal-contador', 'dados-fiscais-completos'],
    async ({ token }) => {
      const { certificado } = createPainelContadorUseCases(token)
      return certificado.verificarDadosFiscaisCompletos()
    }
  )

  const invalidatePortal = () => invalidate(['portal-contador'])

  const uploadMutation = useSecureTenantMutation(
    async ({ token }, input: unknown) => {
      const { certificado } = createPainelContadorUseCases(token)
      return certificado.upload(input)
    },
    {
      onSuccess: async () => {
        showToast.success('Certificado cadastrado com sucesso')
        await invalidatePortal()
      },
      onError: (e: Error) => showToast.error(e.message),
    }
  )

  const removeMutation = useSecureTenantMutation(
    async ({ token }) => {
      const { certificado } = createPainelContadorUseCases(token)
      return certificado.remover()
    },
    {
      onSuccess: async () => {
        showToast.success('Certificado removido')
        await invalidatePortal()
      },
      onError: (e: Error) => showToast.error(e.message),
    }
  )

  return {
    certificadoQuery,
    dadosCompletosQuery,
    uploadMutation,
    removeMutation,
    refetchDadosCompletos: () => dadosCompletosQuery.refetch(),
  }
}
