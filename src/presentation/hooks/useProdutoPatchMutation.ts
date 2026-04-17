'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { updateProdutoValor } from '@/src/application/use-cases/produtos/UpdateProdutoValorUseCase'
import { updateProdutoStatus } from '@/src/application/use-cases/produtos/UpdateProdutoStatusUseCase'
import { updateProdutoToggle } from '@/src/application/use-cases/produtos/UpdateProdutoToggleUseCase'
import { applyPatchToInfinitePages } from '@/src/presentation/components/features/produtos/ProdutosList/utils'
import { toggleFieldConfig } from '@/src/presentation/components/features/produtos/ProdutosList/constants'
import type { ProdutoPatch, ToggleField } from '@/src/shared/types/produto'

export type ProdutoPatchPayload =
  | { type: 'valor'; produtoId: string; novoValor: number }
  | { type: 'status'; produtoId: string; novoStatus: boolean; filterStatus?: string }
  | { type: 'toggle'; produtoId: string; field: ToggleField; novoValor: boolean }

function payloadToPatch(payload: ProdutoPatchPayload): ProdutoPatch {
  switch (payload.type) {
    case 'valor':
      return { valor: payload.novoValor }
    case 'status':
      return { ativo: payload.novoStatus }
    case 'toggle':
      return { [payload.field]: payload.novoValor }
  }
}

function successMessage(payload: ProdutoPatchPayload): string {
  switch (payload.type) {
    case 'valor':
      return 'Valor atualizado com sucesso!'
    case 'status':
      return payload.novoStatus ? 'Produto ativado com sucesso!' : 'Produto desativado com sucesso!'
    case 'toggle': {
      const cfg = toggleFieldConfig[payload.field]
      return payload.novoValor ? cfg.successTrue : cfg.successFalse
    }
  }
}

/**
 * Mutation com atualização otimista + rollback automático para patches de produto.
 * Elimina a necessidade de `localProdutos`, `pendingUpdatesRef` e os 3 mapas de saving.
 */
export function useProdutoPatchMutation() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation<void, Error, ProdutoPatchPayload, { snapshot: [unknown, unknown][] }>({
    mutationFn: async (payload) => {
      const token = auth?.getAccessToken()
      if (!token) throw new Error('Token não encontrado. Faça login novamente.')

      switch (payload.type) {
        case 'valor':
          return updateProdutoValor({ produtoId: payload.produtoId, novoValor: payload.novoValor, token })
        case 'status':
          return updateProdutoStatus({ produtoId: payload.produtoId, novoStatus: payload.novoStatus, token })
        case 'toggle':
          return updateProdutoToggle({
            produtoId: payload.produtoId,
            bodyKey: toggleFieldConfig[payload.field].bodyKey as string,
            novoValor: payload.novoValor,
            token,
          })
      }
    },

    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['produtos', 'infinite'], exact: false })
      const snapshot = queryClient.getQueriesData<unknown>({ queryKey: ['produtos', 'infinite'] })
      const patch = payloadToPatch(payload)

      queryClient.setQueriesData(
        { queryKey: ['produtos', 'infinite'], exact: false },
        (old) => applyPatchToInfinitePages(old, payload.produtoId, patch)
      )

      return { snapshot: snapshot as [unknown, unknown][] }
    },

    onError: (_err, _payload, ctx) => {
      if (ctx?.snapshot) {
        ctx.snapshot.forEach(([key, data]) => {
          queryClient.setQueryData(key as Parameters<typeof queryClient.setQueryData>[0], data)
        })
      }
      showToast.error(_err.message || 'Erro ao atualizar produto')
    },

    onSuccess: (_data, payload) => {
      showToast.success(successMessage(payload))
    },
  })
}
