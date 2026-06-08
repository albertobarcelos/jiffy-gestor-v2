'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'

export function useChaveIbpt() {
  const { auth, isRehydrated, isAuthenticated } = useAuthStore()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  const statusQuery = useQuery({
    queryKey: ['portal-contador', 'ibpt', empresaId],
    enabled: isRehydrated && isAuthenticated && !!token,
    queryFn: async () => {
      const { chaveIbpt } = createPainelContadorUseCases(token!)
      return chaveIbpt.getStatus()
    },
  })

  const salvarMutation = useMutation({
    mutationFn: async (chave: string) => {
      const { chaveIbpt } = createPainelContadorUseCases(token!)
      return chaveIbpt.salvar(chave)
    },
    onSuccess: () => {
      showToast.success('Chave IBPT salva com sucesso')
      queryClient.invalidateQueries({ queryKey: ['portal-contador', 'ibpt', empresaId] })
      queryClient.invalidateQueries({ queryKey: ['portal-contador', 'progresso', empresaId] })
    },
    onError: (e: Error) => showToast.error(e.message),
  })

  const removerMutation = useMutation({
    mutationFn: async () => {
      const { chaveIbpt } = createPainelContadorUseCases(token!)
      return chaveIbpt.remover()
    },
    onSuccess: () => {
      showToast.success('Chave IBPT removida')
      queryClient.invalidateQueries({ queryKey: ['portal-contador', 'ibpt', empresaId] })
      queryClient.invalidateQueries({ queryKey: ['portal-contador', 'progresso', empresaId] })
    },
    onError: (e: Error) => showToast.error(e.message),
  })

  return { statusQuery, salvarMutation, removerMutation }
}
