import { useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { Complemento } from '@/src/domain/entities/Complemento'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

interface ComplementosQueryParams {
  q?: string
  ativo?: boolean | null
  limit?: number
  offset?: number
}

interface ComplementosResponse {
  items: any[]
  count: number
}

/**
 * Hook para buscar complementos com paginação infinita
 */
export function useComplementosInfinite(params: Omit<ComplementosQueryParams, 'offset'> = {}) {
  return useSecureTenantInfiniteQuery(
    ['complementos', 'infinite', params],
    async ({ token }, pageParam) => {
      const limit = params.limit || 10
      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', String(pageParam))

      const response = await fetchGestorApi(`/api/complementos?${searchParams.toString()}`, {
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

      const data: ComplementosResponse = await response.json()

      const complementos = (data.items || []).map((item: any) => Complemento.fromJSON(item))
      const hasMore = complementos.length === limit
      const nextOffset = hasMore ? pageParam + complementos.length : null

      return {
        complementos,
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
 * Hook para buscar complementos simples (sem paginação infinita).
 * Ideal para uso em formulários e dropdowns.
 */
export function useComplementos(params: { ativo?: boolean; limit?: number } = {}) {
  const normalizedLimit = Math.min(params.limit ?? 100, 2000)

  return useSecureTenantQuery<Complemento[]>(
    ['complementos', 'simple', params.ativo, normalizedLimit],
    async ({ token }) => {
      const queryParams = new URLSearchParams()
      if (params.ativo !== undefined) queryParams.append('ativo', params.ativo.toString())
      queryParams.append('limit', normalizedLimit.toString())
      queryParams.append('offset', '0')

      const response = await fetchGestorApi(`/api/complementos?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao carregar complementos')
      }

      const data = await response.json()
      return (data.items || []).map((item: any) => Complemento.fromJSON(item))
    },
    { staleTime: 1000 * 60 * 10 }
  )
}

/**
 * Hook para buscar um único complemento por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useComplemento(id: string) {
  return useSecureTenantQuery<Complemento>(
    ['complemento', id],
    async ({ token }) => {
      const response = await fetchGestorApi(`/api/complementos/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `Erro ao carregar complemento ${id}`)
      }

      const data = await response.json()
      return Complemento.fromJSON(data)
    },
    { staleTime: 1000 * 60 * 5, enabled: !!id }
  )
}

/**
 * Hook para criar/atualizar complemento
 */
export function useComplementoMutation() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async ({ token }, { complementoId, data, isUpdate }: { complementoId?: string; data: any; isUpdate: boolean }) => {
      const url = isUpdate && complementoId ? `/api/complementos/${complementoId}` : '/api/complementos'
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
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'complementos'] })
        showToast.success(variables.isUpdate ? 'Complemento atualizado com sucesso!' : 'Complemento criado com sucesso!')
      },
    }
  )
}




