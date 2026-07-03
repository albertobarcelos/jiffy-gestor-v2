import { useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

interface MeiosPagamentoQueryParams {
  q?: string
  ativo?: boolean | null
  limit?: number
  offset?: number
  enabled?: boolean
  /** Padrão false (igual ao QueryProvider); evita refetch ao focar aba em fluxos longos */
  refetchOnWindowFocus?: boolean
}

interface MeiosPagamentoResponse {
  items: any[]
  count: number
}

/**
 * Hook para buscar meios de pagamento com paginação infinita
 */
export function useMeiosPagamentoInfinite(params: Omit<MeiosPagamentoQueryParams, 'offset'> = {}) {
  return useSecureTenantInfiniteQuery(
    ['meios-pagamentos', 'infinite', params],
    async ({ token }, pageParam) => {
      const limit = params.limit || 10
      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', String(pageParam))

      const response = await fetchGestorApi(`/api/meios-pagamentos?${searchParams.toString()}`, {
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
    {
      enabled: params.enabled ?? true,
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextOffset,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: params.refetchOnWindowFocus ?? false,
    }
  )
}

/**
 * Hook para buscar um único meio de pagamento por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useMeioPagamento(id: string) {
  return useSecureTenantQuery<MeioPagamento>(
    ['meio-pagamento', id],
    async ({ token }) => {
      const response = await fetchGestorApi(`/api/meios-pagamentos/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

/**
 * Hook para criar/atualizar meio de pagamento
 */
export function useMeioPagamentoMutation() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async ({ token }, { meioPagamentoId, data, isUpdate }: { meioPagamentoId?: string; data: any; isUpdate: boolean }) => {
      const url = isUpdate && meioPagamentoId ? `/api/meios-pagamentos/${meioPagamentoId}` : '/api/meios-pagamentos'
      const method = isUpdate ? 'PUT' : 'POST'

      const response = await fetchGestorApi(url, {
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
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'meios-pagamentos'] })
        showToast.success(variables.isUpdate ? 'Meio de pagamento atualizado com sucesso!' : 'Meio de pagamento criado com sucesso!')
      },
    }
  )
}





