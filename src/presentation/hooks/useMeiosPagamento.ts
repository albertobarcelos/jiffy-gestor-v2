import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'

interface MeiosPagamentoQueryParams {
  q?: string
  ativo?: boolean | null
  limit?: number
  offset?: number
}

interface MeiosPagamentoResponse {
  items: any[]
  count: number
}

/**
 * Hook para buscar meios de pagamento com paginação infinita
 */
export function useMeiosPagamentoInfinite(params: Omit<MeiosPagamentoQueryParams, 'offset'> = {}) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  return useInfiniteQuery({
    queryKey: ['meios-pagamentos', 'infinite', params],
    queryFn: async ({ pageParam = 0 }): Promise<{ meiosPagamento: MeioPagamento[]; count: number; nextOffset: number | null }> => {
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

      const response = await fetch(`/api/meios-pagamentos?${searchParams.toString()}`, {
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

      const data: MeiosPagamentoResponse = await response.json()

      const meiosPagamento = (data.items || []).map((item: any) => MeioPagamento.fromJSON(item))
      const hasMore = meiosPagamento.length === limit
      const nextOffset = hasMore ? pageParam + meiosPagamento.length : null

      return {
        meiosPagamento,
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
 * Hook para buscar um único meio de pagamento por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useMeioPagamento(id: string) {
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<MeioPagamento, ApiError>({
    queryKey: ['meio-pagamento', id],
    queryFn: async () => {
      if (!isAuthenticated || !token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const response = await fetch(`/api/meios-pagamentos/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || errorData.message || `Erro ao carregar meio de pagamento ${id}`,
          response.status,
          errorData
        )
      }

      const data = await response.json()
      return MeioPagamento.fromJSON(data)
    },
    enabled: isAuthenticated && !!token && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
    onError: (error) => {
      showToast.error(error.message || `Erro ao carregar meio de pagamento ${id}.`)
    },
  })
}

/**
 * Hook para criar/atualizar meio de pagamento
 */
export function useMeioPagamentoMutation() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ meioPagamentoId, data, isUpdate }: { meioPagamentoId?: string; data: any; isUpdate: boolean }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const url = isUpdate && meioPagamentoId ? `/api/meios-pagamentos/${meioPagamentoId}` : '/api/meios-pagamentos'
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
      queryClient.invalidateQueries({ queryKey: ['meios-pagamentos'] })
      showToast.success(variables.isUpdate ? 'Meio de pagamento atualizado com sucesso!' : 'Meio de pagamento criado com sucesso!')
    },
    onError: (error) => {
      const errorMessage = handleApiError(error)
      showToast.error(errorMessage || 'Erro ao salvar meio de pagamento')
    },
  })
}

