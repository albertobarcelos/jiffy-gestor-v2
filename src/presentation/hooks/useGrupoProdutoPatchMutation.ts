'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { showToast } from '@/src/shared/utils/toast'
import { isReplicacaoStatusCategoriaFalhou } from '@/src/application/errors/ReplicacaoStatusCategoriaFalhouError'
import { updateGrupoProdutoStatusUseCase } from '@/src/infrastructure/composition/categoriaStatusUseCases'
import { invalidarCatalogoVendaQueries } from '@/src/presentation/cache/catalogoVendaQueryCache'

export interface GrupoProdutoPatchPayload {
  grupoId: string
  novoStatus: boolean
}

/**
 * Ativa/desativa um grupo. A orquestração (base → lista → cardápios) fica no use case.
 */
export function useGrupoProdutoPatchMutation() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<void, GrupoProdutoPatchPayload>(
    async ({ token }, { grupoId, novoStatus }) =>
      updateGrupoProdutoStatusUseCase.execute(
        { grupoId, novoStatus, token },
        {
          aposGravarBase: async () => {
            await queryClient.invalidateQueries({
              queryKey: ['tenant', empresaId, 'grupos-produtos'],
              exact: false,
            })
            await queryClient.invalidateQueries({
              queryKey: ['tenant', empresaId, 'produtos', 'infinite'],
              exact: false,
            })
          },
        }
      ),
    {
      onSuccess: async (_data, variables) => {
        await invalidate(['menu-grupos'])
        invalidarCatalogoVendaQueries(queryClient, empresaId, {
          tipo: 'categoria',
          grupoProdutoId: variables.grupoId,
        })
      },
      onError: async (err, variables) => {
        if (isReplicacaoStatusCategoriaFalhou(err)) {
          await invalidate(['menu-grupos'])
          invalidarCatalogoVendaQueries(queryClient, empresaId, {
            tipo: 'categoria',
            grupoProdutoId: variables.grupoId,
          })
        }
        showToast.error(err.message || 'Erro ao atualizar status do grupo')
      },
    }
  )
}
