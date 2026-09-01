'use client'

import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

/** Limite máximo aceito pela API `/api/v1/cardapio/grupos-produtos` (validação upstream). */
export const GRUPOS_PRODUTOS_API_MAX_LIMIT = 100

interface GruposProdutosQueryParams {
  name?: string
  ativo?: boolean | null
  limit?: number
  offset?: number
  enabled?: boolean
  /** Padrão true; use false em modais longos para não refetch ao voltar o foco da aba */
  refetchOnWindowFocus?: boolean
}

interface GruposProdutosResponse {
  success: boolean
  items?: any[]
  grupos?: any[]
  count?: number
  message?: string
}

/**
 * Hook para buscar grupos de produtos usando React Query.
 * Ideal para uso em formulários e dropdowns.
 */
export function useGruposProdutos(params: GruposProdutosQueryParams = {}) {
  return useSecureTenantQuery<GrupoProduto[]>(
    ['grupos-produtos', params.name, params.ativo, params.limit],
    async ({ token }) => {
      const mapResponse = async (response: Response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new ApiError(
            errorData.message || 'Erro ao carregar grupos de produtos',
            response.status,
            errorData
          )
        }
        const data = await response.json()
        const pageItems = data.items || data.grupos || []
        return pageItems.map((item: unknown) => GrupoProduto.fromJSON(item))
      }

      const buildSearchParams = (offset: number, limit?: number) => {
        const queryParams = new URLSearchParams()
        if (params.name) queryParams.append('name', params.name)
        if (params.ativo !== null && params.ativo !== undefined) {
          queryParams.append('ativo', params.ativo.toString())
        }
        if (limit !== undefined) {
          queryParams.append('limit', String(limit))
        }
        queryParams.append('offset', String(offset))
        return queryParams
      }

      /** Sem `limit`: mantém default da rota BFF (`limit` = 10). */
      if (params.limit === undefined) {
        const response = await fetchGestorApi(
          `/api/grupos-produtos?${buildSearchParams(0).toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )
        return mapResponse(response)
      }

      const desired = Math.min(Math.max(1, params.limit), 10_000)
      const acumulado: GrupoProduto[] = []
      let offset = 0

      while (acumulado.length < desired) {
        const batch = Math.min(GRUPOS_PRODUTOS_API_MAX_LIMIT, desired - acumulado.length)
        const response = await fetchGestorApi(
          `/api/grupos-produtos?${buildSearchParams(offset, batch).toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )
        const page = await mapResponse(response)
        acumulado.push(...page)
        if (page.length < batch) break
        offset += page.length
      }

      return acumulado.slice(0, desired)
    },
    {
      enabled: params.enabled ?? true,
      staleTime: 1000 * 60 * 3,
      refetchOnMount: true,
      refetchOnWindowFocus: params.refetchOnWindowFocus ?? true,
    }
  )
}

/**
 * Hook para buscar grupos de produtos com paginação infinita (scroll infinito)
 */
export function useGruposProdutosInfinite(params: Omit<GruposProdutosQueryParams, 'offset'> = {}) {
  return useSecureTenantInfiniteQuery(
    ['grupos-produtos', 'infinite', params],
    async ({ token }, pageParam) => {
      const limit = Math.min(params.limit || 10, GRUPOS_PRODUTOS_API_MAX_LIMIT)
      const searchParams = new URLSearchParams()
      if (params.name) searchParams.append('q', params.name)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', String(pageParam))

      const response = await fetchGestorApi(`/api/grupos-produtos?${searchParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data: GruposProdutosResponse = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Erro ao processar resposta da API')
      }

      const grupos = (data.items || []).map((item: any) => GrupoProduto.fromJSON(item))
      const hasMore = grupos.length === limit
      const nextOffset = hasMore ? pageParam + grupos.length : null

      return {
        grupos,
        count: data.count || 0,
        nextOffset,
      }
    },
    {
      enabled: params.enabled ?? true,
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextOffset,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      placeholderData: previousData => previousData,
    }
  )
}
