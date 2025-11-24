import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Impressora } from '@/src/domain/entities/Impressora'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'

interface ImpressorasQueryParams {
  q?: string
  ativo?: boolean | null
  limit?: number
  offset?: number
}

interface ImpressorasResponse {
  items: any[]
  count: number
}

/**
 * Hook para buscar impressoras com paginação infinita
 */
export function useImpressorasInfinite(params: Omit<ImpressorasQueryParams, 'offset'> = {}) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  return useInfiniteQuery({
    queryKey: ['impressoras', 'infinite', params],
    queryFn: async ({ pageParam = 0 }): Promise<{ impressoras: Impressora[]; count: number; nextOffset: number | null }> => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const limit = params.limit || 10
      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', pageParam.toString())

      const response = await fetch(`/api/impressoras?${searchParams.toString()}`, {
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

      const data: ImpressorasResponse = await response.json()

      const impressoras = (data.items || []).map((item: any) => Impressora.fromJSON(item))
      const hasMore = impressoras.length === limit
      const nextOffset = hasMore ? pageParam + impressoras.length : null

      return {
        impressoras,
        count: data.count || 0,
        nextOffset,
      }
    },
    enabled: !!token,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar uma única impressora por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useImpressora(id: string) {
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<Impressora, ApiError>({
    queryKey: ['impressora', id],
    queryFn: async () => {
      if (!isAuthenticated || !token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const response = await fetch(`/api/impressoras/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || errorData.message || `Erro ao carregar impressora ${id}`,
          response.status,
          errorData
        )
      }

      const data = await response.json()
      return Impressora.fromJSON(data)
    },
    enabled: isAuthenticated && !!token && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para criar/atualizar impressora
 */
export function useImpressoraMutation() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ impressoraId, data, isUpdate }: { impressoraId?: string; data: any; isUpdate: boolean }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const url = isUpdate && impressoraId ? `/api/impressoras/${impressoraId}` : '/api/impressoras'
      const method = isUpdate ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['impressoras'] })
      showToast.success(variables.isUpdate ? 'Impressora atualizada com sucesso!' : 'Impressora criada com sucesso!')
    },
  })
}





