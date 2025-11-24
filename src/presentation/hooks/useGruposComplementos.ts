import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'

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
 * Hook para buscar grupos de complementos com paginação infinita
 */
export function useGruposComplementosInfinite(params: Omit<GruposComplementosQueryParams, 'offset'> = {}) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  return useInfiniteQuery({
    queryKey: ['grupos-complementos', 'infinite', params],
    queryFn: async ({ pageParam = 0 }): Promise<{ grupos: GrupoComplemento[]; count: number; nextOffset: number | null }> => {
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

      const response = await fetch(`/api/grupos-complementos?${searchParams.toString()}`, {
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
    enabled: !!token,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    refetchOnWindowFocus: false, // Não refetch ao focar na janela
    refetchOnMount: false, // Não refetch ao montar se já tiver dados em cache
    placeholderData: (previousData) => previousData, // Prefetch automático
  })
}

/**
 * Hook para buscar um único grupo de complemento por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useGrupoComplemento(id: string) {
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<GrupoComplemento, ApiError>({
    queryKey: ['grupo-complemento', id],
    queryFn: async () => {
      if (!isAuthenticated || !token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const response = await fetch(`/api/grupos-complementos/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    enabled: isAuthenticated && !!token && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para criar/atualizar grupo de complementos
 */
export function useGrupoComplementoMutation() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ grupoId, data, isUpdate }: { grupoId?: string; data: any; isUpdate: boolean }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const url = isUpdate && grupoId ? `/api/grupos-complementos/${grupoId}` : '/api/grupos-complementos'
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
        const errorMessage = errorData.error || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['grupos-complementos'] })
      showToast.success(variables.isUpdate ? 'Grupo atualizado com sucesso!' : 'Grupo criado com sucesso!')
    },
  })
}




