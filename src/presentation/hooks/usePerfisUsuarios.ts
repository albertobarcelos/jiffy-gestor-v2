import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { PerfilUsuario } from '@/src/domain/entities/PerfilUsuario'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'

interface PerfisUsuariosQueryParams {
  q?: string
  ativo?: boolean | null
  limit?: number
  offset?: number
}

interface PerfisUsuariosResponse {
  items: any[]
  count: number
}

/**
 * Hook para buscar perfis de usuários com paginação infinita
 */
export function usePerfisUsuariosInfinite(params: Omit<PerfisUsuariosQueryParams, 'offset'> = {}) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  return useInfiniteQuery({
    queryKey: ['perfis-usuarios-pdv', 'infinite', params],
    queryFn: async ({ pageParam = 0 }): Promise<{ perfis: PerfilUsuario[]; count: number; nextOffset: number | null }> => {
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

      const response = await fetch(`/api/perfis-usuarios-pdv?${searchParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data: PerfisUsuariosResponse = await response.json()

      const perfis = (data.items || []).map((item: any) => PerfilUsuario.fromJSON(item))
      const hasMore = perfis.length === limit
      const nextOffset = hasMore ? pageParam + perfis.length : null

      return {
        perfis,
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
 * Hook para buscar um único perfil de usuário por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function usePerfilUsuario(id: string) {
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<PerfilUsuario, ApiError>({
    queryKey: ['perfil-usuario', id],
    queryFn: async () => {
      if (!isAuthenticated || !token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const response = await fetch(`/api/perfis-usuarios-pdv/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || errorData.message || `Erro ao carregar perfil de usuário ${id}`,
          response.status,
          errorData
        )
      }

      const data = await response.json()
      return PerfilUsuario.fromJSON(data)
    },
    enabled: isAuthenticated && !!token && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
    onError: (error) => {
      showToast.error(error.message || `Erro ao carregar perfil de usuário ${id}.`)
    },
  })
}

/**
 * Hook para criar/atualizar perfil de usuário
 */
export function usePerfilUsuarioMutation() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ perfilId, data, isUpdate }: { perfilId?: string; data: any; isUpdate: boolean }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const url = isUpdate && perfilId ? `/api/perfis-usuarios-pdv/${perfilId}` : '/api/perfis-usuarios-pdv'
      const method = isUpdate ? 'PATCH' : 'POST'

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
        const errorMessage = errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['perfis-usuarios-pdv'] })
      showToast.success(variables.isUpdate ? 'Perfil atualizado com sucesso!' : 'Perfil criado com sucesso!')
    },
    onError: (error) => {
      const errorMessage = handleApiError(error)
      showToast.error(errorMessage || 'Erro ao salvar perfil')
    },
  })
}

