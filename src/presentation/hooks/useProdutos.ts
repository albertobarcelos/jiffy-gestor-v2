import { useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { Produto } from '@/src/domain/entities/Produto'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

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
  warning?: string
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
  return useSecureTenantQuery(
    ['produtos', params],
    async ({ token }) => {
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

      const response = await fetchGestorApi(`/api/produtos?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
        next: { revalidate: 0 },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`)
      }

      const data: ProdutosResponse = await response.json()
      if (!data.success) throw new Error(data.message || 'Erro ao processar resposta da API')

      return {
        produtos: (data.items || []).map((item: any) => Produto.fromJSON(item)),
        count: data.count || 0,
      }
    },
    {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnReconnect: true,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  )
}

/**
 * Hook para buscar produtos com paginação infinita (scroll infinito)
 */
export function useProdutosInfinite(params: Omit<ProdutosQueryParams, 'offset'> = {}) {
  return useSecureTenantInfiniteQuery(
    ['produtos', 'infinite', params],
    async ({ token }, pageParam) => {
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
      searchParams.append('offset', String(pageParam))

      const response = await fetchGestorApi(`/api/produtos?${searchParams.toString()}`, {
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
    {
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextOffset,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      placeholderData: keepPreviousData,
    }
  )
}

/**
 * Hook para buscar um único produto por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useProduto(id: string) {
  return useSecureTenantQuery<Produto>(
    ['produto', id],
    async ({ token }) => {
      const response = await fetchGestorApi(`/api/produtos/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

/**
 * Hook para criar/atualizar produto com Optimistic Updates
 */
export function useProdutoMutation() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async ({ token }, { produtoId, data, isUpdate }: { produtoId?: string; data: any; isUpdate: boolean }) => {
      const url = isUpdate && produtoId ? `/api/produtos/${produtoId}` : '/api/produtos'
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
      onMutate: async ({ produtoId, data, isUpdate }) => {
        await queryClient.cancelQueries({ queryKey: ['tenant', empresaId, 'produtos'], exact: false })

        const previousProdutos = queryClient.getQueryData(['tenant', empresaId, 'produtos', 'infinite'])

        if (isUpdate && produtoId) {
          queryClient.setQueriesData({ queryKey: ['tenant', empresaId, 'produto', produtoId] }, (old: any) => {
            if (!old) return old
            return { ...old, ...data }
          })
        }

        return { previousProdutos }
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'produtos'] })
        if (variables.produtoId) {
          queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'produto', variables.produtoId] })
        }
        showToast.success(variables.isUpdate ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!')
      },
    }
  )
}





