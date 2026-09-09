'use client'

import { useMemo } from 'react'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

const PAGE_SIZE = 100

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

/**
 * Mapa `produtoId → codigoProduto` a partir do JSON cru de `/api/produtos`.
 * Evita perder/alterar o código no roundtrip da entidade ao exibir na lista do menu.
 */
export function useProdutosCodigoPorId(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true

  const query = useSecureTenantQuery<Record<string, string>>(
    ['produtos', 'codigos-por-id'],
    async ({ token }) => {
      const mapa: Record<string, string> = {}
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
          const codigo = parseCodigoProduto(item.codigoProduto ?? item.codigo)
          if (id && codigo) mapa[id] = codigo
        }

        if (items.length < PAGE_SIZE) break
        offset += items.length
      }

      return mapa
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
    for (const [id, codigo] of Object.entries(query.data ?? {})) {
      map.set(id, codigo)
    }
    return map
  }, [query.data])

  return { codigoPorId, ...query }
}
