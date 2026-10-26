'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { showToast } from '@/src/shared/utils/toast'
import { listarTerminaisPagina } from '@/src/infrastructure/api/terminaisConfigApi'

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
      const response = await listarTerminaisPagina(token, {
        offset: 0,
        limit: params.limit,
        q: params.q,
      })

      if (!response.ok) {
        throw new ApiError(response.error, response.status)
      }

      return (response.data.items || []) as Terminal[]
    },
    { staleTime: 1000 * 60 * 10 }
  )
}





