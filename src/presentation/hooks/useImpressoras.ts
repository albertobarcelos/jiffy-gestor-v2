import { useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { Impressora } from '@/src/domain/entities/Impressora'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

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
  return useSecureTenantInfiniteQuery(
    ['impressoras', 'infinite', params],
    async ({ token }, pageParam) => {
      const limit = params.limit || 10
      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', String(pageParam))

      const response = await fetchGestorApi(`/api/impressoras?${searchParams.toString()}`, {
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
    {
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextOffset,
      staleTime: 1000 * 60 * 5,
    }
  )
}

/**
 * Hook para buscar uma única impressora por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useImpressora(id: string) {
  return useSecureTenantQuery<Impressora>(
    ['impressora', id],
    async ({ token }) => {
      const response = await fetchGestorApi(`/api/impressoras/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
    { staleTime: 1000 * 60 * 5, enabled: !!id }
  )
}

/**
 * Hook para criar/atualizar impressora
 */
export function useImpressoraMutation() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async ({ token }, { impressoraId, data, isUpdate }: { impressoraId?: string; data: any; isUpdate: boolean }) => {
      const url = isUpdate && impressoraId ? `/api/impressoras/${impressoraId}` : '/api/impressoras'
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
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'impressoras'] })
        showToast.success(variables.isUpdate ? 'Impressora atualizada com sucesso!' : 'Impressora criada com sucesso!')
      },
    }
  )
}





