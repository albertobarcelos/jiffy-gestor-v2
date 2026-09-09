'use client'

import { useMemo } from 'react'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'

/**
 * Empresa com exatamente um menu (em geral o Principal).
 * Usado para simplificar Cardápio / cadastro de produtos.
 */
export function useEmpresaMenuUnico() {
  const { data, isPending, isFetching, refetch } = useMenus({ limit: 2 })

  const menuUnicoId = useMemo(() => {
    const total = data?.count ?? data?.items?.length ?? 0
    if (total !== 1) return null
    const items = data?.items ?? []
    const principal = items.find(m => m.tipo === 'principal')
    return principal?.id ?? items[0]?.id ?? null
  }, [data])

  return {
    isMenuUnico: menuUnicoId != null,
    menuUnicoId,
    isLoading: isPending,
    isFetching,
    refetch,
  }
}
