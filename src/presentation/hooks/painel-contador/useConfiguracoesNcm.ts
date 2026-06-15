'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'

export function useConfiguracoesNcm() {
  const { auth, isRehydrated, isAuthenticated } = useAuthStore()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  const ncmsQuery = useQuery({
    queryKey: ['portal-contador', 'ncms', empresaId],
    enabled: isRehydrated && isAuthenticated && !!token,
    queryFn: async () => {
      const { listarNcms } = createPainelContadorUseCases(token!)
      return listarNcms.execute()
    },
  })

  const salvarMutation = useMutation({
    mutationFn: async ({ ncm, input }: { ncm: string; input: unknown }) => {
      const { salvarNcm } = createPainelContadorUseCases(token!)
      return salvarNcm.execute(ncm, input)
    },
    onSuccess: () => {
      showToast.success('Configuração NCM salva')
      queryClient.invalidateQueries({ queryKey: ['portal-contador', 'ncms', empresaId] })
      queryClient.invalidateQueries({ queryKey: ['portal-contador', 'progresso', empresaId] })
    },
    onError: (e: Error) => showToast.error(e.message),
  })

  const copiarMutation = useMutation({
    mutationFn: async ({ ncm, input }: { ncm: string; input: unknown }) => {
      const { copiarNcm } = createPainelContadorUseCases(token!)
      return copiarNcm.execute(ncm, input)
    },
    onSuccess: () => {
      showToast.success('Configuração copiada')
      queryClient.invalidateQueries({ queryKey: ['portal-contador', 'ncms', empresaId] })
    },
    onError: (e: Error) => showToast.error(e.message),
  })

  return { ncmsQuery, salvarMutation, copiarMutation }
}
