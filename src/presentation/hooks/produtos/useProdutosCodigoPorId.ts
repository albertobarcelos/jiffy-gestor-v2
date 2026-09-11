'use client'

import { useMemo } from 'react'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import {
  boolFlagProduto,
  type CatalogoProdutoListaIndex,
  type MenuProdutoPermissoes,
} from '@/src/shared/utils/menuProdutoPermissoes'

const PAGE_SIZE = 100

export const CATALOGO_PRODUTOS_INDEX_QUERY_KEY = ['produtos', 'codigos-por-id'] as const

export type { CatalogoProdutoListaIndex }

function parseCodigoProduto(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value))
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim()
  }
  return ''
}

function parseProdutoId(value: unknown): string {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function parsePermissoes(item: Record<string, unknown>): MenuProdutoPermissoes {
  return {
    permiteAcrescimo: boolFlagProduto(item.permiteAcrescimo),
    permiteDesconto: boolFlagProduto(item.permiteDesconto),
    abreComplementos: boolFlagProduto(item.abreComplementos),
    permiteAlterarPreco: boolFlagProduto(item.permiteAlterarPreco),
    incideTaxa: boolFlagProduto(item.incideTaxa),
  }
}

/**
 * Mapa `produtoId → codigoProduto` e permissões do cadastro a partir de `/api/produtos`.
 * Evita perder o código no roundtrip da entidade e alimenta os ícones rápidos do cardápio.
 */
export function useProdutosCodigoPorId(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true

  const query = useSecureTenantQuery<CatalogoProdutoListaIndex>(
    CATALOGO_PRODUTOS_INDEX_QUERY_KEY,
    async ({ token }) => {
      const index: CatalogoProdutoListaIndex = { codigos: {}, permissoes: {} }
      let offset = 0

      for (;;) {
        const response = await fetchGestorApi(
          `/api/produtos?limit=${PAGE_SIZE}&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            cache: 'no-store',
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            (errorData as { message?: string }).message ||
              `Erro ao carregar códigos dos produtos (${response.status})`
          )
        }

        const data = (await response.json()) as {
          items?: unknown[]
          success?: boolean
          message?: string
        }

        if (data.success === false) {
          throw new Error(data.message || 'Erro ao carregar códigos dos produtos')
        }

        const items = Array.isArray(data.items) ? data.items : []
        for (const raw of items) {
          if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
          const item = raw as Record<string, unknown>
          const id = parseProdutoId(item.id)
          if (!id) continue
          const codigo = parseCodigoProduto(item.codigoProduto ?? item.codigo)
          if (codigo) index.codigos[id] = codigo
          index.permissoes[id] = parsePermissoes(item)
        }

        if (items.length < PAGE_SIZE) break
        offset += items.length
      }

      return index
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
