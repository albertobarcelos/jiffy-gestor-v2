'use client'

import {
  buscarMenuViaBffUseCase,
  listarMenusViaBffUseCase,
} from '@/src/application/use-cases/menus/menuBffUseCases'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import type { Menu } from '@/src/shared/types/menus'

interface UseMenusParams {
  q?: string
  ativo?: boolean | null
  tipo?: string
  limit?: number
  offset?: number
  enabled?: boolean
}

/**
 * Lista menus da empresa (cadastro de cardápios).
 */
export function useMenus(params: UseMenusParams = {}) {
  const {
    q = '',
    ativo = null,
    tipo,
    limit = 50,
    offset = 0,
    enabled = true,
  } = params

  return useSecureTenantQuery<{ items: Menu[]; count: number }>(
    ['menus', q, ativo, tipo, limit, offset],
    async ({ token }) =>
      listarMenusViaBffUseCase.execute({
        token,
        q,
        ativo,
        tipo,
        limit,
        offset,
      }),
    { enabled, staleTime: 1000 * 60 * 5 }
  )
}

/**
 * Detalhe de um menu.
 */
export function useMenu(menuId: string | undefined, enabled = true) {
  return useSecureTenantQuery<Menu>(
    ['menu', menuId],
    async ({ token }) => {
      if (!menuId) throw new Error('Menu não informado')
      return buscarMenuViaBffUseCase.execute({ token, menuId })
    },
    { enabled: Boolean(menuId) && enabled, staleTime: 1000 * 60 * 5 }
  )
}
