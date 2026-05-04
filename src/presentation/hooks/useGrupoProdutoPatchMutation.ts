'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { updateGrupoProdutoStatus } from '@/src/application/use-cases/produtos/UpdateGrupoProdutoStatusUseCase'

export interface GrupoProdutoPatchPayload {
  grupoId: string
  novoStatus: boolean
}

/**
 * Mutation para ativar/desativar um grupo de produtos.
 * Invalida os caches de grupos e produtos após sucesso.
 */
export function useGrupoProdutoPatchMutation() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation<void, Error, GrupoProdutoPatchPayload>({
    mutationFn: async ({ grupoId, novoStatus }) => {
      const token = auth?.getAccessToken()
      if (!token) throw new Error('Token não encontrado. Faça login novamente.')
      return updateGrupoProdutoStatus({ grupoId, novoStatus, token })
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['grupos-produtos'], exact: false })
      await queryClient.invalidateQueries({ queryKey: ['produtos', 'infinite'], exact: false })
    },

    onError: (err) => {
      showToast.error(err.message || 'Erro ao atualizar status do grupo')
    },
  })
}
