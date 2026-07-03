import { useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

interface GruposComplementosQueryParams {
  q?: string
  ativo?: boolean | null
  limit?: number
  offset?: number
}

interface GruposComplementosResponse {
  items: any[]
  count?: number
}

/**
 * Hook para buscar grupos de complementos (lista simples)
 */
export function useGruposComplementos(params: GruposComplementosQueryParams = {}) {
  return useSecureTenantQuery<GrupoComplemento[]>(
    ['grupos-complementos', params.q, params.ativo],
    async ({ token }) => {
      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.ativo !== null && params.ativo !== undefined) {
        searchParams.append('ativo', params.ativo.toString())
      }
      if (params.limit) searchParams.append('limit', params.limit.toString())
      searchParams.append('offset', params.offset?.toString() ?? '0')

      const response = await fetchGestorApi(`/api/grupos-complementos?${searchParams.toString()}`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || errorData.message || 'Erro ao carregar grupos de complementos',
          response.status,
          errorData
        )
      }

      const data: GruposComplementosResponse = await response.json()
      return (data.items || []).map((item: any) => GrupoComplemento.fromJSON(item))
    },
    { staleTime: 1000 * 60 * 5 }
  )
}

/**
 * Hook para buscar grupos de complementos com paginação infinita
 */
export function useGruposComplementosInfinite(params: Omit<GruposComplementosQueryParams, 'offset'> = {}) {
  return useSecureTenantInfiniteQuery(
    ['grupos-complementos', 'infinite', params],
    async ({ token }, pageParam) => {
      const limit = params.limit || 10
      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', String(pageParam))

      const response = await fetchGestorApi(`/api/grupos-complementos?${searchParams.toString()}`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data: GruposComplementosResponse = await response.json()

      // Filtrar grupos inválidos (com qtdMinima > qtdMaxima)
      const validGrupos: GrupoComplemento[] = []
      for (const item of data.items || []) {
        try {
          const grupo = GrupoComplemento.fromJSON(item)
          validGrupos.push(grupo)
        } catch (error) {
          if (error instanceof Error && error.message.includes('Quantidade mínima não pode ser maior que máxima')) {
            console.warn(`Grupo de complementos inválido ignorado:`, item)
          } else {
            throw error
          }
        }
      }

      const hasMore = validGrupos.length === limit
      const nextOffset = hasMore ? pageParam + validGrupos.length : null

      return {
        grupos: validGrupos,
        count: data.count || 0,
        nextOffset,
      }
    },
    {
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextOffset,
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
    }
  )
}

/**
 * Hook para buscar um único grupo de complemento por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useGrupoComplemento(id: string) {
  return useSecureTenantQuery<GrupoComplemento>(
    ['grupo-complemento', id],
    async ({ token }) => {
      const response = await fetchGestorApi(`/api/grupos-complementos/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || errorData.message || `Erro ao carregar grupo de complemento ${id}`,
          response.status,
          errorData
        )
      }

      const data = await response.json()
      return GrupoComplemento.fromJSON(data)
    },
    { staleTime: 1000 * 60 * 5, enabled: !!id }
  )
}

/**
 * Hook para criar/atualizar grupo de complementos
 */
export function useGrupoComplementoMutation() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async ({ token }, { grupoId, data, isUpdate }: { grupoId?: string; data: any; isUpdate: boolean }) => {
      const url = isUpdate && grupoId ? `/api/grupos-complementos/${grupoId}` : '/api/grupos-complementos'
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
        const errorMessage = errorData.error || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'grupos-complementos'] })
        showToast.success(variables.isUpdate ? 'Grupo atualizado com sucesso!' : 'Grupo criado com sucesso!')
      },
    }
  )
}




