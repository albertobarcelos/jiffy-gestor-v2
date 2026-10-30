'use client'

import {
  carregarEdicaoCategoriaPizzaUseCase,
  salvarEdicaoCategoriaPizzaUseCase,
} from '@/src/infrastructure/composition/pizzaUseCases'
import type { PizzaCategoriaEditDraft } from '@/src/application/mappers/pizza/pizzaEditMappers'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'

/**
 * Carrega draft completo de edição (tamanhos, sabores, massas, bordas, adicionais).
 * `sessionKey` força novo fetch ao reabrir o painel na mesma categoria.
 */
export function useCarregarEdicaoCategoriaPizza(
  categoriaId: string | null | undefined,
  enabled = true,
  sessionKey = 0
) {
  return useSecureTenantQuery<PizzaCategoriaEditDraft>(
    ['pizza', 'edicao', categoriaId, sessionKey],
    ({ token }) =>
      carregarEdicaoCategoriaPizzaUseCase.execute({
        token,
        categoriaId: categoriaId!,
      }),
    {
      enabled: Boolean(categoriaId) && enabled,
      staleTime: 0,
    }
  )
}

export function useSalvarEdicaoCategoriaPizzaMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<void, PizzaCategoriaEditDraft>(
    ({ token }, draft) => salvarEdicaoCategoriaPizzaUseCase.execute({ token, draft }),
    {
      onSuccess: async () => {
        await invalidate(['pizza'])
      },
    }
  )
}
