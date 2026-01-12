'use client'

import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { showToast } from '@/src/shared/utils/toast'

interface GruposProdutosQueryParams {
  name?: string
  ativo?: boolean | null
  limit?: number
  offset?: number
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
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<GrupoProduto[], ApiError>({
    queryKey: ['grupos-produtos', params.name, params.ativo],
    queryFn: async () => {
      if (!isAuthenticated || !token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const queryParams = new URLSearchParams()
      if (params.name) queryParams.append('name', params.name)
      if (params.ativo !== null && params.ativo !== undefined) {
        queryParams.append('ativo', params.ativo.toString())
      }
      if (params.limit) queryParams.append('limit', params.limit.toString())
      queryParams.append('offset', '0')

      const response = await fetch(`/api/grupos-produtos?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.message || 'Erro ao carregar grupos de produtos',
          response.status,
          errorData
        )
      }

      const data = await response.json()
      const grupos = (data.items || data.grupos || []).map((item: any) =>
        GrupoProduto.fromJSON(item)
      )

      return grupos
    },
    enabled: isAuthenticated && !!token,
    staleTime: 1000 * 60 * 10, // 10 minutos (grupos mudam pouco)
    refetchOnMount: true, // Sempre refetch ao montar para garantir dados atualizados
  })
}

/**
 * Hook para buscar grupos de produtos com paginação infinita (scroll infinito)
 */
export function useGruposProdutosInfinite(params: Omit<GruposProdutosQueryParams, 'offset'> = {}) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  return useInfiniteQuery({
    queryKey: ['grupos-produtos', 'infinite', params],
    queryFn: async ({ pageParam = 0 }): Promise<{ grupos: GrupoProduto[]; count: number; nextOffset: number | null }> => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const limit = params.limit || 10
      const searchParams = new URLSearchParams()
      if (params.name) searchParams.append('q', params.name)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', pageParam.toString())

      const response = await fetch(`/api/grupos-produtos?${searchParams.toString()}`, {
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
    enabled: !!token,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    refetchOnWindowFocus: false, // Não refetch ao focar na janela
    refetchOnMount: true, // SEMPRE refetch ao montar para garantir dados atualizados após reordenação
    placeholderData: (previousData) => previousData, // Prefetch automático
  })
}


