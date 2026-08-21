'use client'

import { useEffect, useMemo } from 'react'
import {
  MENU_CATALOG_PAGE_SIZE,
  useMenuGruposProdutos,
} from '@/src/presentation/hooks/menus/useMenuCatalog'
import type { DesignCategoriaGrupo } from '../types/designCategoriaGrupo'
import { mapMenuGruposToDesignCategorias } from '../utils/mapDesignCategoriaGrupos'

export function useDesignCategoriaGrupos(menuId: string | null, enabled = true) {
  const hasMenu = Boolean(menuId)
  const query = useMenuGruposProdutos({
    menuId: menuId ?? undefined,
    limit: MENU_CATALOG_PAGE_SIZE,
    enabled: enabled && hasMenu,
  })

  useEffect(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return
    void query.fetchNextPage()
  }, [query.fetchNextPage, query.hasNextPage, query.isFetchingNextPage])

  const grupos = useMemo<DesignCategoriaGrupo[]>(() => {
    const items = query.data?.pages.flatMap(page => page.items) ?? []
    return mapMenuGruposToDesignCategorias(items)
  }, [query.data])

  return {
    grupos,
    hasMenu,
    isLoading: hasMenu && query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
