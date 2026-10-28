'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { showToast } from '@/src/shared/utils/toast'
import {
  replicarStatusCategoriaBaseNosMenusUseCase,
  updateGrupoProdutoStatusUseCase,
} from '@/src/infrastructure/composition/categoriaStatusUseCases'
import { invalidarCatalogoVendaQueries } from '@/src/presentation/cache/catalogoVendaQueryCache'

export interface GrupoProdutoPatchPayload {
  grupoId: string
  novoStatus: boolean
}

/**
 * Mutation para ativar/desativar um grupo de produtos.
 * Após gravar a base, invalida a lista; depois replica nos cardápios e invalida menus.
 */
export function useGrupoProdutoPatchMutation() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<void, GrupoProdutoPatchPayload>(
    async ({ token }, { grupoId, novoStatus }) => {
      await updateGrupoProdutoStatusUseCase.atualizarAtivoBase({
        grupoId,
        novoStatus,
        token,
      })

      await queryClient.invalidateQueries({
        queryKey: ['tenant', empresaId, 'grupos-produtos'],
        exact: false,
      })
      await queryClient.invalidateQueries({
        queryKey: ['tenant', empresaId, 'produtos', 'infinite'],
        exact: false,
      })

      await replicarStatusCategoriaBaseNosMenusUseCase.execute({
        token,
        grupoProdutoId: grupoId,
        ativo: novoStatus,
      })
    },
    {
      onSuccess: async (_data, variables) => {
        await invalidate(['menu-grupos'])
        invalidarCatalogoVendaQueries(queryClient, empresaId, {
          tipo: 'categoria',
          grupoProdutoId: variables.grupoId,
        })
      },
      onError: async (err, variables) => {
        // Base pode ter gravado e a lista já ter refetchado; menus ainda precisam reconciliar.
        await invalidate(['menu-grupos'])
        invalidarCatalogoVendaQueries(queryClient, empresaId, {
          tipo: 'categoria',
          grupoProdutoId: variables.grupoId,
        })
        showToast.error(err.message || 'Erro ao atualizar status do grupo')
      },
    }
  )
}
