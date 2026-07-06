import { useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { Usuario } from '@/src/domain/entities/Usuario'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

interface UsuariosQueryParams {
  q?: string
  name?: string
  perfilPdvId?: string
  tipoUsuarioPdv?: string
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
  return useSecureTenantInfiniteQuery(
    ['usuarios', 'infinite', params],
    async ({ token }, pageParam) => {
      const limit = params.limit || 10
      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.name) searchParams.append('name', params.name)
      if (params.perfilPdvId) searchParams.append('perfilPdvId', params.perfilPdvId)
      if (params.tipoUsuarioPdv) searchParams.append('tipoUsuarioPdv', params.tipoUsuarioPdv)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', String(pageParam))

      const response = await fetchGestorApi(`/api/usuarios?${searchParams.toString()}`, {
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
    {
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextOffset,
      staleTime: 1000 * 60 * 5,
    }
  )
}

/**
 * Hook para buscar um único usuário por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useUsuario(id: string) {
  return useSecureTenantQuery<Usuario>(
    ['usuario', id],
    async ({ token }) => {
      const response = await fetchGestorApi(`/api/usuarios/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

/**
 * Hook para criar/atualizar usuário com Optimistic Updates
 */
export function useUsuarioMutation() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async ({ token }, { usuarioId, data, isUpdate }: { usuarioId?: string; data: any; isUpdate: boolean }) => {
      const url = isUpdate && usuarioId ? `/api/usuarios/${usuarioId}` : '/api/usuarios'
      const method = isUpdate ? 'PATCH' : 'POST'

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
      onMutate: async ({ usuarioId, data, isUpdate }) => {
        await queryClient.cancelQueries({ queryKey: ['tenant', empresaId, 'usuarios'], exact: false })

        const previousUsuarios = queryClient.getQueryData(['tenant', empresaId, 'usuarios', 'infinite'])

        if (isUpdate && usuarioId) {
          queryClient.setQueriesData({ queryKey: ['tenant', empresaId, 'usuario', usuarioId] }, (old: any) => {
            if (!old) return old
            return { ...old, ...data }
          })
        }

        return { previousUsuarios }
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'usuarios'] })
        if (variables.usuarioId) {
          queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'usuario', variables.usuarioId] })
        }
        showToast.success(variables.isUpdate ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!')
      },
    }
  )
}





