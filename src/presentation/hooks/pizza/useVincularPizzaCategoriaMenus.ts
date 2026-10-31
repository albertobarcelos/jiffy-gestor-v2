'use client'

import { useMemo } from 'react'
import { vincularPizzaCategoriaMenusUseCase } from '@/src/infrastructure/composition/pizzaUseCases'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'

export type PizzaCategoriaMenusVinculos = {
  linkedMenuIds: string[]
  saboresCount: number
}

/** Lista cardápios já vinculados à categoria + contagem de sabores ativos. */
export function usePizzaCategoriaMenusVinculos(
  categoriaPizzaId: string | undefined,
  menuIds: string[],
  enabled = true
) {
  const menuIdsKey = useMemo(() => [...menuIds].filter(Boolean).sort().join(','), [menuIds])

  return useSecureTenantQuery<PizzaCategoriaMenusVinculos>(
    ['pizza', 'menus-vinculos', categoriaPizzaId, menuIdsKey],
    async ({ token }) => {
      const [linkedMenuIds, sabores] = await Promise.all([
        vincularPizzaCategoriaMenusUseCase.listarMenuIdsComPizzaCategoria({
          token,
          categoriaPizzaId: categoriaPizzaId!,
          menuIds,
        }),
        vincularPizzaCategoriaMenusUseCase.listarSaboresAtivosDaCategoria({
          token,
          categoriaPizzaId: categoriaPizzaId!,
        }),
      ])
      return { linkedMenuIds, saboresCount: sabores.length }
    },
    {
      enabled: Boolean(categoriaPizzaId) && enabled && menuIds.length > 0,
      staleTime: 1000 * 30,
    }
  )
}

export function useVincularPizzaCategoriaAoMenuMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<
    number,
    { menuId: string; categoriaPizzaId: string }
  >(
    ({ token }, { menuId, categoriaPizzaId }) =>
      vincularPizzaCategoriaMenusUseCase.vincularPizzaCategoriaAoMenu({
        token,
        menuId,
        categoriaPizzaId,
      }),
    {
      onSuccess: async (_data, variables) => {
        await invalidate(['pizza', 'menus-vinculos', variables.categoriaPizzaId])
        await invalidate(['menu', variables.menuId])
        await invalidate(['menu-produtos', variables.menuId])
        await invalidate(['menu-grupos', variables.menuId])
      },
    }
  )
}

export function useDesvincularPizzaCategoriaDoMenuMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<
    void,
    { menuId: string; categoriaPizzaId: string }
  >(
    ({ token }, { menuId, categoriaPizzaId }) =>
      vincularPizzaCategoriaMenusUseCase.desvincularPizzaCategoriaDoMenu({
        token,
        menuId,
        categoriaPizzaId,
      }),
    {
      onSuccess: async (_data, variables) => {
        await invalidate(['pizza', 'menus-vinculos', variables.categoriaPizzaId])
        await invalidate(['menu', variables.menuId])
        await invalidate(['menu-produtos', variables.menuId])
        await invalidate(['menu-grupos', variables.menuId])
      },
    }
  )
}
