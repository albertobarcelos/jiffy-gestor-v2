'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { showToast } from '@/src/shared/utils/toast'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

interface Terminal {
  id: string
  nome: string
  [key: string]: any
}

interface TerminaisQueryParams {
  q?: string
  limit?: number
}

/**
 * Hook para buscar terminais usando React Query.
 * Ideal para uso em formulários de impressoras.
 */
export function useTerminais(params: TerminaisQueryParams = {}) {
  return useSecureTenantQuery<Terminal[]>(
    ['terminais', params.q],
    async ({ token }) => {
      const queryParams = new URLSearchParams()
      if (params.q) queryParams.append('q', params.q)
      if (params.limit) queryParams.append('limit', params.limit.toString())
      queryParams.append('offset', '0')

      const response = await fetchGestorApi(`/api/terminais?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || 'Erro ao carregar terminais',
          response.status,
          errorData
        )
      }

      const data = await response.json()
      return data.items || []
    },
    { staleTime: 1000 * 60 * 10 }
  )
}





