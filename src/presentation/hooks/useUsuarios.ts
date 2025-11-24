import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Usuario } from '@/src/domain/entities/Usuario'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'

interface UsuariosQueryParams {
  q?: string
  name?: string
  perfilPdvId?: string
  ativo?: boolean | null
  limit?: number
  offset?: number
}

interface UsuariosResponse {
  items: any[]
  count: number
}

/**
 * Hook para buscar usuários com paginação infinita
 */
export function useUsuariosInfinite(params: Omit<UsuariosQueryParams, 'offset'> = {}) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  return useInfiniteQuery({
    queryKey: ['usuarios', 'infinite', params],
    queryFn: async ({ pageParam = 0 }): Promise<{ usuarios: Usuario[]; count: number; nextOffset: number | null }> => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const limit = params.limit || 10
      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.name) searchParams.append('name', params.name)
      if (params.perfilPdvId) searchParams.append('perfilPdvId', params.perfilPdvId)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', pageParam.toString())

      const response = await fetch(`/api/usuarios?${searchParams.toString()}`, {
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

      const data: UsuariosResponse = await response.json()

      const usuarios = (data.items || []).map((item: any) => Usuario.fromJSON(item))
      const hasMore = usuarios.length === limit
      const nextOffset = hasMore ? pageParam + usuarios.length : null

      return {
        usuarios,
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
 * Hook para buscar um único usuário por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useUsuario(id: string) {
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<Usuario, ApiError>({
    queryKey: ['usuario', id],
    queryFn: async () => {
      if (!isAuthenticated || !token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const response = await fetch(`/api/usuarios/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || errorData.message || `Erro ao carregar usuário ${id}`,
          response.status,
          errorData
        )
      }

      const data = await response.json()
      return Usuario.fromJSON(data)
    },
    enabled: isAuthenticated && !!token && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
    onError: (error) => {
      showToast.error(error.message || `Erro ao carregar usuário ${id}.`)
    },
  })
}

/**
 * Hook para criar/atualizar usuário com Optimistic Updates
 */
export function useUsuarioMutation() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ usuarioId, data, isUpdate }: { usuarioId?: string; data: any; isUpdate: boolean }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const url = isUpdate && usuarioId ? `/api/usuarios/${usuarioId}` : '/api/usuarios'
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
        const errorMessage = errorData.message || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    // Optimistic Update: atualiza UI antes da resposta do servidor
    onMutate: async ({ usuarioId, data, isUpdate }) => {
      await queryClient.cancelQueries({ queryKey: ['usuarios'] })

      const previousUsuarios = queryClient.getQueryData(['usuarios', 'infinite'])

      if (isUpdate && usuarioId) {
        queryClient.setQueryData(['usuario', usuarioId], (old: any) => {
          if (!old) return old
          return { ...old, ...data }
        })
      }

      return { previousUsuarios }
    },
    onError: (error, variables, context) => {
      if (context?.previousUsuarios) {
        queryClient.setQueryData(['usuarios', 'infinite'], context.previousUsuarios)
      }
      const errorMessage = handleApiError(error)
      showToast.error(errorMessage || 'Erro ao salvar usuário')
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      if (variables.usuarioId) {
        queryClient.invalidateQueries({ queryKey: ['usuario', variables.usuarioId] })
      }
      showToast.success(variables.isUpdate ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!')
    },
  })
}

