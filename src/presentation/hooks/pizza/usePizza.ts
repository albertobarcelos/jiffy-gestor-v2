'use client'

import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import type {
  CategoriaPizza,
  CategoriaPizzaCompletoResponse,
  CreateCategoriaPizzaCompletoInput,
  CreateSaborPizzaInput,
  PizzaTamanho,
  SaborPizza,
  SaborPizzaSummary,
} from '@/src/shared/types/pizza'

async function parseError(response: Response, fallback: string) {
  const errorData = await response.json().catch(() => ({}))
  throw new ApiError(
    (errorData as { message?: string }).message || fallback,
    response.status,
    errorData
  )
}

export function usePizzaCategorias(params: {
  q?: string
  ativo?: boolean | null
  limit?: number
  offset?: number
  enabled?: boolean
} = {}) {
  const { q = '', ativo = null, limit = 50, offset = 0, enabled = true } = params

  return useSecureTenantQuery<{ items: CategoriaPizza[]; count: number }>(
    ['pizza', 'categorias', q, ativo, limit, offset],
    async ({ token }) => {
      const searchParams = new URLSearchParams()
      if (q.trim()) searchParams.set('q', q.trim())
      if (ativo !== null) searchParams.set('ativo', String(ativo))
      searchParams.set('limit', String(limit))
      searchParams.set('offset', String(offset))

      const response = await fetchGestorApi(
        `/api/cardapio/pizza/categorias?${searchParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!response.ok) await parseError(response, 'Erro ao carregar categorias pizza')
      const data = await response.json()
      return { items: (data.items ?? []) as CategoriaPizza[], count: data.count ?? 0 }
    },
    { enabled, staleTime: 1000 * 60 * 2 }
  )
}

export function usePizzaCategoria(categoriaId: string | undefined, enabled = true) {
  return useSecureTenantQuery<CategoriaPizza>(
    ['pizza', 'categoria', categoriaId],
    async ({ token }) => {
      const response = await fetchGestorApi(`/api/cardapio/pizza/categorias/${categoriaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) await parseError(response, 'Erro ao carregar categoria pizza')
      const data = await response.json()
      return data.data as CategoriaPizza
    },
    { enabled: Boolean(categoriaId) && enabled }
  )
}

export function usePizzaSabores(
  categoriaPizzaId: string | undefined,
  params: { q?: string; ativo?: boolean | null; limit?: number; enabled?: boolean } = {}
) {
  const { q = '', ativo = null, limit = 100, enabled = true } = params

  return useSecureTenantQuery<{ items: SaborPizzaSummary[]; count: number }>(
    ['pizza', 'sabores', categoriaPizzaId, q, ativo, limit],
    async ({ token }) => {
      const searchParams = new URLSearchParams()
      searchParams.set('categoriaPizzaId', categoriaPizzaId!)
      if (q.trim()) searchParams.set('q', q.trim())
      if (ativo !== null) searchParams.set('ativo', String(ativo))
      searchParams.set('limit', String(limit))
      searchParams.set('offset', '0')

      const response = await fetchGestorApi(
        `/api/cardapio/pizza/sabores?${searchParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!response.ok) await parseError(response, 'Erro ao carregar sabores')
      const data = await response.json()
      return { items: (data.items ?? []) as SaborPizzaSummary[], count: data.count ?? 0 }
    },
    { enabled: Boolean(categoriaPizzaId) && enabled, staleTime: 1000 * 60 * 2 }
  )
}

export function usePizzaTamanhos(categoriaPizzaId: string | undefined, enabled = true) {
  return useSecureTenantQuery<{ items: PizzaTamanho[]; count: number }>(
    ['pizza', 'tamanhos', categoriaPizzaId],
    async ({ token }) => {
      const searchParams = new URLSearchParams()
      searchParams.set('categoriaPizzaId', categoriaPizzaId!)
      searchParams.set('limit', '50')
      searchParams.set('offset', '0')

      const response = await fetchGestorApi(
        `/api/cardapio/pizza/tamanhos?${searchParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!response.ok) await parseError(response, 'Erro ao carregar tamanhos')
      const data = await response.json()
      return { items: (data.items ?? []) as PizzaTamanho[], count: data.count ?? 0 }
    },
    { enabled: Boolean(categoriaPizzaId) && enabled, staleTime: 1000 * 60 * 2 }
  )
}

export function useCriarPizzaCategoriaCompletoMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<CategoriaPizzaCompletoResponse, CreateCategoriaPizzaCompletoInput>(
    async ({ token }, input) => {
      const response = await fetchGestorApi('/api/cardapio/pizza/categorias/completo', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })
      if (!response.ok) await parseError(response, 'Erro ao criar categoria pizza')
      const data = await response.json()
      return data.data as CategoriaPizzaCompletoResponse
    },
    {
      onSuccess: async () => {
        await invalidate(['pizza'])
      },
    }
  )
}

export function useCriarPizzaSaborMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<SaborPizza, CreateSaborPizzaInput>(
    async ({ token }, input) => {
      const response = await fetchGestorApi('/api/cardapio/pizza/sabores', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })
      if (!response.ok) await parseError(response, 'Erro ao criar sabor')
      const data = await response.json()
      return data.data as SaborPizza
    },
    {
      onSuccess: async (_data, variables) => {
        await invalidate(['pizza'])
        if (variables.categoriaPizzaId) {
          await invalidate(['pizza', 'sabores', variables.categoriaPizzaId])
        }
      },
    }
  )
}

export function useAtualizarPizzaCategoriaMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<
    CategoriaPizza,
    { id: string; patch: Partial<CategoriaPizza> }
  >(
    async ({ token }, { id, patch }) => {
      const response = await fetchGestorApi(`/api/cardapio/pizza/categorias/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
      })
      if (!response.ok) await parseError(response, 'Erro ao atualizar categoria')
      const data = await response.json()
      return data.data as CategoriaPizza
    },
    {
      onSuccess: async () => {
        await invalidate(['pizza'])
      },
    }
  )
}
