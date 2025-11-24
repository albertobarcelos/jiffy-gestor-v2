import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Complemento } from '@/src/domain/entities/Complemento'
import { handleApiError, showToast } from '@/src/shared/utils/toast'

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
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  return useInfiniteQuery({
    queryKey: ['complementos', 'infinite', params],
    queryFn: async ({ pageParam = 0 }): Promise<{ complementos: Complemento[]; count: number; nextOffset: number | null }> => {
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

      const response = await fetch(`/api/complementos?${searchParams.toString()}`, {
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
    enabled: !!token,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar complementos simples (sem paginação infinita).
 * Ideal para uso em formulários e dropdowns.
 */
export function useComplementos(params: { ativo?: boolean; limit?: number } = {}) {
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<Complemento[], Error>({
    queryKey: ['complementos', 'simple', params.ativo],
    queryFn: async () => {
      if (!isAuthenticated || !token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const queryParams = new URLSearchParams()
      if (params.ativo !== undefined) {
        queryParams.append('ativo', params.ativo.toString())
      }
      queryParams.append('limit', (params.limit || 1000).toString())
      queryParams.append('offset', '0')

      const response = await fetch(`/api/complementos?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao carregar complementos')
      }

      const data = await response.json()
      const complementos = (data.items || []).map((item: any) => Complemento.fromJSON(item))

      return complementos
    },
    enabled: isAuthenticated && !!token,
    staleTime: 1000 * 60 * 10, // 10 minutos (complementos mudam pouco)
    onError: (error) => {
      showToast.error(error.message || 'Erro ao carregar complementos.')
    },
  })
}

/**
 * Hook para buscar um único complemento por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useComplemento(id: string) {
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<Complemento, Error>({
    queryKey: ['complemento', id],
    queryFn: async () => {
      if (!isAuthenticated || !token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const response = await fetch(`/api/complementos/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `Erro ao carregar complemento ${id}`)
      }

      const data = await response.json()
      return Complemento.fromJSON(data)
    },
    enabled: isAuthenticated && !!token && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
    onError: (error) => {
      showToast.error(error.message || `Erro ao carregar complemento ${id}.`)
    },
  })
}

/**
 * Hook para criar/atualizar complemento
 */
export function useComplementoMutation() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ complementoId, data, isUpdate }: { complementoId?: string; data: any; isUpdate: boolean }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const url = isUpdate && complementoId ? `/api/complementos/${complementoId}` : '/api/complementos'
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
      queryClient.invalidateQueries({ queryKey: ['complementos'] })
      showToast.success(variables.isUpdate ? 'Complemento atualizado com sucesso!' : 'Complemento criado com sucesso!')
    },
    onError: (error) => {
      const errorMessage = handleApiError(error)
      showToast.error(errorMessage || 'Erro ao salvar complemento')
    },
  })
}

