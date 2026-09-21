'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { showToast } from '@/src/shared/utils/toast'
import { updateGrupoProdutoStatus } from '@/src/application/use-cases/produtos/UpdateGrupoProdutoStatusUseCase'
import { invalidarCatalogoVendaQueries } from '@/src/presentation/cache/catalogoVendaQueryCache'

export interface GrupoProdutoPatchPayload {
  grupoId: string
  novoStatus: boolean
}

/**
 * Mutation para ativar/desativar um grupo de produtos.
 * Invalida os caches de grupos e produtos após sucesso.
 */
export function useGrupoProdutoPatchMutation() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation<void, GrupoProdutoPatchPayload>(
    async ({ token }, { grupoId, novoStatus }) =>
      updateGrupoProdutoStatus({ grupoId, novoStatus, token }),
    {
      onSuccess: async (_data, variables) => {
        await queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'grupos-produtos'], exact: false })
        await queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'produtos', 'infinite'], exact: false })
        invalidarCatalogoVendaQueries(queryClient, empresaId, {
          tipo: 'categoria',
          grupoProdutoId: variables.grupoId,
        })
      },
      onError: (err) => {
        showToast.error(err.message || 'Erro ao atualizar status do grupo')
      },
    }
  )
}
