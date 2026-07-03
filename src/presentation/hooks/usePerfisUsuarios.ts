import { useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { PerfilUsuario } from '@/src/domain/entities/PerfilUsuario'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

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
  return useSecureTenantInfiniteQuery(
    ['perfis-usuarios-pdv', 'infinite', params],
    async ({ token }, pageParam) => {
      const limit = params.limit || 10
      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.ativo !== undefined && params.ativo !== null) {
        searchParams.append('ativo', params.ativo.toString())
      }
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', String(pageParam))

      const response = await fetchGestorApi(`/api/perfis-usuarios-pdv?${searchParams.toString()}`, {
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
    {
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextOffset,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function usePerfilUsuario(id: string) {
  return useSecureTenantQuery<PerfilUsuario>(
    ['perfil-usuario', id],
    async ({ token }) => {
      const response = await fetchGestorApi(`/api/perfis-usuarios-pdv/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

/**
 * Hook para criar/atualizar perfil de usuário
 */
export function usePerfilUsuarioMutation() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async ({ token }, { perfilId, data, isUpdate }: { perfilId?: string; data: any; isUpdate: boolean }) => {
      const url = isUpdate && perfilId ? `/api/perfis-usuarios-pdv/${perfilId}` : '/api/perfis-usuarios-pdv'
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
        const errorMessage = errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'perfis-usuarios-pdv'] })
        showToast.success(variables.isUpdate ? 'Perfil atualizado com sucesso!' : 'Perfil criado com sucesso!')
      },
    }
  )
}





