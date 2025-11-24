'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { showToast } from '@/src/shared/utils/toast'

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
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<Terminal[], ApiError>({
    queryKey: ['terminais', params.q],
    queryFn: async () => {
      if (!isAuthenticated || !token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const queryParams = new URLSearchParams()
      if (params.q) queryParams.append('q', params.q)
      if (params.limit) queryParams.append('limit', params.limit.toString())
      queryParams.append('offset', '0')

      const response = await fetch(`/api/terminais?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
      const terminais = data.items || []

      return terminais
    },
    enabled: isAuthenticated && !!token,
    staleTime: 1000 * 60 * 10, // 10 minutos (terminais mudam pouco)
  })
}





