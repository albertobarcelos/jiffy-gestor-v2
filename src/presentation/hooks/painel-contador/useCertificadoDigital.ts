'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'

export function useCertificadoDigital() {
  const { auth, isRehydrated, isAuthenticated } = useAuthStore()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  const certificadoQuery = useQuery({
    queryKey: ['portal-contador', 'certificado', empresaId],
    enabled: isRehydrated && isAuthenticated && !!token,
    queryFn: async () => {
      const { certificado } = createPainelContadorUseCases(token!)
      return certificado.getCertificado()
    },
  })

  const dadosCompletosQuery = useQuery({
    queryKey: ['portal-contador', 'dados-fiscais-completos', empresaId],
    enabled: isRehydrated && isAuthenticated && !!token,
    queryFn: async () => {
      const { certificado } = createPainelContadorUseCases(token!)
      return certificado.verificarDadosFiscaisCompletos()
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['portal-contador'] })
  }

  const uploadMutation = useMutation({
    mutationFn: async (input: unknown) => {
      const { certificado } = createPainelContadorUseCases(token!)
      return certificado.upload(input)
    },
    onSuccess: () => {
      showToast.success('Certificado cadastrado com sucesso')
      invalidate()
    },
    onError: (e: Error) => showToast.error(e.message),
  })

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { certificado } = createPainelContadorUseCases(token!)
      return certificado.remover()
    },
    onSuccess: () => {
      showToast.success('Certificado removido')
      invalidate()
    },
    onError: (e: Error) => showToast.error(e.message),
  })

  return {
    certificadoQuery,
    dadosCompletosQuery,
    uploadMutation,
    removeMutation,
    refetchDadosCompletos: () => dadosCompletosQuery.refetch(),
  }
}
