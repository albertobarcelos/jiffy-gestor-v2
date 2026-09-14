'use client'

import { useMemo } from 'react'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { CatalogoProdutoListaIndex } from '@/src/shared/utils/menuProdutoPermissoes'
import type { MenuProdutoPermissoes } from '@/src/shared/utils/menuProdutoPermissoes'

export const CATALOGO_PRODUTOS_INDEX_QUERY_KEY = ['produtos', 'codigos-por-id'] as const

export type { CatalogoProdutoListaIndex }

/**
 * Mapa `produtoId → codigoProduto` e permissões do cadastro.
 * Uma chamada ao BFF slim `/api/produtos/catalogo-index` (paginação no servidor).
 */
export function useProdutosCodigoPorId(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true

  const query = useSecureTenantQuery<CatalogoProdutoListaIndex>(
    CATALOGO_PRODUTOS_INDEX_QUERY_KEY,
    async ({ token }) => {
      const response = await fetchGestorApi('/api/produtos/catalogo-index', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          (errorData as { message?: string }).message ||
            `Erro ao carregar códigos dos produtos (${response.status})`
        )
      }

      const data = (await response.json()) as {
        success?: boolean
        message?: string
        codigos?: Record<string, string>
        permissoes?: Record<string, MenuProdutoPermissoes>
      }

      if (data.success === false) {
        throw new Error(data.message || 'Erro ao carregar códigos dos produtos')
      }

      return {
        codigos: data.codigos ?? {},
        permissoes: data.permissoes ?? {},
      }
    },
    {
      enabled,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
    }
  )

  const codigoPorId = useMemo(() => {
    const map = new Map<string, string>()
    for (const [id, codigo] of Object.entries(query.data?.codigos ?? {})) {
      map.set(id, codigo)
    }
    return map
  }, [query.data?.codigos])

  const permissoesPorId = useMemo(() => {
    const map = new Map<string, MenuProdutoPermissoes>()
    for (const [id, permissoes] of Object.entries(query.data?.permissoes ?? {})) {
      map.set(id, permissoes)
    }
    return map
  }, [query.data?.permissoes])

  return { codigoPorId, permissoesPorId, ...query }
}
