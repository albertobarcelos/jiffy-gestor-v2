import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Produto } from '@/src/domain/entities/Produto'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'

interface ProdutosQueryParams {
  name?: string
  ativo?: boolean | null
  ativoLocal?: boolean | null
  ativoDelivery?: boolean | null
  grupoProdutoId?: string
  grupoComplementosId?: string
  limit?: number
  offset?: number
}

interface ProdutosResponse {
  success: boolean
  items: any[]
  count: number
  message?: string
}

/**
 * Hook para buscar produtos com React Query
 * 
 * Benefícios:
 * - Cache automático (5 minutos)
 * - Deduplicação de requisições
 * - Stale-while-revalidate
 * - Retry automático
 */
export function useProdutos(params: ProdutosQueryParams = {}) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  const queryKey = ['produtos', params]

  return useQuery({
    queryKey,
    queryFn: async (): Promise<{ produtos: Produto[]; count: number }> => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const searchParams = new URLSearchParams()
      if (params.name) searchParams.append('name', params.name)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      if (params.ativoLocal !== undefined && params.ativoLocal !== null) {
        searchParams.append('ativoLocal', params.ativoLocal.toString())
      }
      if (params.ativoDelivery !== undefined && params.ativoDelivery !== null) {
        searchParams.append('ativoDelivery', params.ativoDelivery.toString())
      }
      if (params.grupoProdutoId) {
        searchParams.append('grupoProdutoId', params.grupoProdutoId)
      }
      if (params.grupoComplementosId) {
        searchParams.append('grupoComplementosId', params.grupoComplementosId)
      }
      if (params.limit) searchParams.append('limit', params.limit.toString())
      if (params.offset) searchParams.append('offset', params.offset.toString())

      const response = await fetch(`/api/produtos?${searchParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        next: { revalidate: 0 },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data: ProdutosResponse = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Erro ao processar resposta da API')
      }

      const produtos = (data.items || []).map((item: any) => Produto.fromJSON(item))

      return {
        produtos,
        count: data.count || 0,
      }
    },
    enabled: !!token, // Só executa se tiver token
    staleTime: 0,
    gcTime: 1000 * 60 * 1,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para buscar produtos com paginação infinita (scroll infinito)
 */
export function useProdutosInfinite(params: Omit<ProdutosQueryParams, 'offset'> = {}) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  return useInfiniteQuery({
    queryKey: ['produtos', 'infinite', params],
    queryFn: async ({ pageParam = 0 }): Promise<{ produtos: Produto[]; count: number; nextOffset: number | null }> => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const limit = params.limit || 10
      const searchParams = new URLSearchParams()
      if (params.name) searchParams.append('name', params.name)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      if (params.ativoLocal !== undefined && params.ativoLocal !== null) {
        searchParams.append('ativoLocal', params.ativoLocal.toString())
      }
      if (params.ativoDelivery !== undefined && params.ativoDelivery !== null) {
        searchParams.append('ativoDelivery', params.ativoDelivery.toString())
      }
      if (params.grupoProdutoId) {
        searchParams.append('grupoProdutoId', params.grupoProdutoId)
      }
      if (params.grupoComplementosId) {
        searchParams.append('grupoComplementosId', params.grupoComplementosId)
      }
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', pageParam.toString())

      const response = await fetch(`/api/produtos?${searchParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        next: { revalidate: 0 },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data: ProdutosResponse = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Erro ao processar resposta da API')
      }

      const produtos = (data.items || []).map((item: any) => Produto.fromJSON(item))
      const hasMore = produtos.length === limit
      const nextOffset = hasMore ? pageParam + produtos.length : null

      return {
        produtos,
        count: data.count || 0,
        nextOffset,
      }
    },
    enabled: !!token,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 0, // sempre considerado “stale” para refetch imediato
    gcTime: 1000 * 60 * 1, // descarta cache rápido (1 min)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    // Não reutiliza dados anteriores para evitar exibir valores antigos
    placeholderData: undefined,
  })
}

/**
 * Hook para buscar um único produto por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useProduto(id: string) {
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<Produto, ApiError>({
    queryKey: ['produto', id],
    queryFn: async () => {
      if (!isAuthenticated || !token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const response = await fetch(`/api/produtos/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.message || `Erro ao carregar produto ${id}`,
          response.status,
          errorData
        )
      }

      const data = await response.json()
      return Produto.fromJSON(data)
    },
    enabled: isAuthenticated && !!token && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para criar/atualizar produto com Optimistic Updates
 */
export function useProdutoMutation() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ produtoId, data, isUpdate }: { produtoId?: string; data: any; isUpdate: boolean }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const url = isUpdate && produtoId ? `/api/produtos/${produtoId}` : '/api/produtos'
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
    onMutate: async ({ produtoId, data, isUpdate }) => {
      // Cancelar queries em andamento para evitar sobrescrever o optimistic update
      await queryClient.cancelQueries({ queryKey: ['produtos'] })

      // Snapshot do valor anterior
      const previousProdutos = queryClient.getQueryData(['produtos', 'infinite'])

      // Se for atualização, atualizar otimisticamente
      if (isUpdate && produtoId) {
        queryClient.setQueryData(['produto', produtoId], (old: any) => {
          if (!old) return old
          return { ...old, ...data }
        })
      }

      // Retornar contexto com snapshot para rollback
      return { previousProdutos }
    },
    onSuccess: (_, variables) => {
      // Invalidar cache de produtos para forçar refetch com dados atualizados
      queryClient.invalidateQueries({ queryKey: ['produtos'] })
      if (variables.produtoId) {
        queryClient.invalidateQueries({ queryKey: ['produto', variables.produtoId] })
      }
      showToast.success(variables.isUpdate ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!')
    },
  })
}





