import { useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { Cliente } from '@/src/domain/entities/Cliente'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

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
  return useSecureTenantQuery(
    ['clientes', params],
    async ({ token }) => {
      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      if (params.limit) searchParams.append('limit', params.limit.toString())
      if (params.offset) searchParams.append('offset', params.offset.toString())

      const response = await fetchGestorApi(`/api/clientes?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`)
      }

      const data: ClientesResponse = await response.json()
      return {
        clientes: (data.items || []).map((item: any) => Cliente.fromJSON(item)),
        count: data.count || 0,
      }
    },
    { staleTime: 1000 * 60 * 5 }
  )
}

/**
 * Hook para buscar clientes com paginação infinita
 */
export function useClientesInfinite(params: Omit<ClientesQueryParams, 'offset'> = {}) {
  return useSecureTenantInfiniteQuery(
    ['clientes', 'infinite', params],
    async ({ token }, pageParam) => {
      const limit = params.limit || 10
      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', String(pageParam))

      const response = await fetchGestorApi(`/api/clientes?${searchParams.toString()}`, {
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
      const total = data.count ?? 0
      const carregadosAteAgora = pageParam + clientes.length
      // Preferir `count` da API para saber se há próxima página (evita loop quando length === limit mas já não há mais registros)
      const hasMore = total > 0 ? carregadosAteAgora < total : clientes.length === limit

      const nextOffset = hasMore ? carregadosAteAgora : null

      return {
        clientes,
        count: total,
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
 * Hook para buscar um único cliente por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useCliente(id: string) {
  return useSecureTenantQuery<Cliente>(
    ['cliente', id],
    async ({ token }) => {
      const response = await fetchGestorApi(`/api/clientes/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

/**
 * Busca clientes por termo de pesquisa (máximo 1 resultado).
 * Usado para localizar cliente pelo telefone de forma imperativa (via mutate).
 */
export function useBuscarClientePorTelefone() {
  return useSecureTenantMutation(async ({ token }, q: string): Promise<Cliente | null> => {
    const params = new URLSearchParams({ q, limit: '1', offset: '0' })
    const response = await fetchGestorApi(`/api/clientes?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.message || `Erro ${response.status}`)
    }

    const data: ClientesResponse = await response.json()
    const itens = (data.items || []).map((item: any) => Cliente.fromJSON(item))
    return itens.length > 0 ? itens[0] : null
  })
}

/**
 * Cria um cliente rápido com apenas nome e telefone.
 * Invalida cache de clientes após sucesso.
 */
export function useCriarClienteRapido() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async ({ token }, { nome, telefone }: { nome: string; telefone: string }): Promise<Cliente> => {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome,
          telefone: telefone.replace(/\D/g, ''),
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || err.message || `Erro ${response.status}`)
      }

      const data = await response.json()
      return Cliente.fromJSON(data)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'clientes'] })
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao criar cliente')
      },
    }
  )
}

/**
 * Hook para criar/atualizar cliente com Optimistic Updates
 */
export function useClienteMutation() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async ({ token }, { clienteId, data, isUpdate }: { clienteId?: string; data: any; isUpdate: boolean }) => {
      const url = isUpdate && clienteId ? `/api/clientes/${clienteId}` : '/api/clientes'
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
      onMutate: async ({ clienteId, data, isUpdate }) => {
        await queryClient.cancelQueries({ queryKey: ['tenant', empresaId, 'clientes'], exact: false })

        const previousClientes = queryClient.getQueryData(['tenant', empresaId, 'clientes', 'infinite'])

        if (isUpdate && clienteId) {
          queryClient.setQueriesData({ queryKey: ['tenant', empresaId, 'cliente', clienteId] }, (old: any) => {
            if (!old) return old
            return { ...old, ...data }
          })
        }

        return { previousClientes }
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'clientes'] })
        if (variables.clienteId) {
          queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'cliente', variables.clienteId] })
        }
        showToast.success(
          variables.isUpdate ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!'
        )
      },
    }
  )
}
