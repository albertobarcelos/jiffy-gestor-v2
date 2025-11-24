import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Cliente } from '@/src/domain/entities/Cliente'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'

interface ClientesQueryParams {
  q?: string
  ativo?: boolean | null
  limit?: number
  offset?: number
}

interface ClientesResponse {
  items: any[]
  count: number
}

/**
 * Hook para buscar clientes com React Query
 */
export function useClientes(params: ClientesQueryParams = {}) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  const queryKey = ['clientes', params]

  return useQuery({
    queryKey,
    queryFn: async (): Promise<{ clientes: Cliente[]; count: number }> => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      if (params.limit) searchParams.append('limit', params.limit.toString())
      if (params.offset) searchParams.append('offset', params.offset.toString())

      const response = await fetch(`/api/clientes?${searchParams.toString()}`, {
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

      const data: ClientesResponse = await response.json()

      const clientes = (data.items || []).map((item: any) => Cliente.fromJSON(item))

      return {
        clientes,
        count: data.count || 0,
      }
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar clientes com paginação infinita
 */
export function useClientesInfinite(params: Omit<ClientesQueryParams, 'offset'> = {}) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  return useInfiniteQuery({
    queryKey: ['clientes', 'infinite', params],
    queryFn: async ({ pageParam = 0 }): Promise<{ clientes: Cliente[]; count: number; nextOffset: number | null }> => {
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

      const response = await fetch(`/api/clientes?${searchParams.toString()}`, {
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

      const data: ClientesResponse = await response.json()

      const clientes = (data.items || []).map((item: any) => Cliente.fromJSON(item))
      const hasMore = clientes.length === limit
      const nextOffset = hasMore ? pageParam + clientes.length : null

      return {
        clientes,
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
 * Hook para buscar um único cliente por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useCliente(id: string) {
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<Cliente, ApiError>({
    queryKey: ['cliente', id],
    queryFn: async () => {
      if (!isAuthenticated || !token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const response = await fetch(`/api/clientes/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || errorData.message || `Erro ao carregar cliente ${id}`,
          response.status,
          errorData
        )
      }

      const data = await response.json()
      return Cliente.fromJSON(data)
    },
    enabled: isAuthenticated && !!token && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
    onError: (error) => {
      showToast.error(error.message || `Erro ao carregar cliente ${id}.`)
    },
  })
}

/**
 * Hook para criar/atualizar cliente com Optimistic Updates
 */
export function useClienteMutation() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ clienteId, data, isUpdate }: { clienteId?: string; data: any; isUpdate: boolean }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const url = isUpdate && clienteId ? `/api/clientes/${clienteId}` : '/api/clientes'
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
    // Optimistic Update: atualiza UI antes da resposta do servidor
    onMutate: async ({ clienteId, data, isUpdate }) => {
      await queryClient.cancelQueries({ queryKey: ['clientes'] })

      const previousClientes = queryClient.getQueryData(['clientes', 'infinite'])

      if (isUpdate && clienteId) {
        queryClient.setQueryData(['cliente', clienteId], (old: any) => {
          if (!old) return old
          return { ...old, ...data }
        })
      }

      return { previousClientes }
    },
    onError: (error, variables, context) => {
      if (context?.previousClientes) {
        queryClient.setQueryData(['clientes', 'infinite'], context.previousClientes)
      }
      const errorMessage = handleApiError(error)
      showToast.error(errorMessage || 'Erro ao salvar cliente')
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      if (variables.clienteId) {
        queryClient.invalidateQueries({ queryKey: ['cliente', variables.clienteId] })
      }
      showToast.success(variables.isUpdate ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!')
    },
  })
}

