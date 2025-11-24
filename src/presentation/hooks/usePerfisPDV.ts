'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { showToast } from '@/src/shared/utils/toast'

interface PerfilPDV {
  id: string
  role: string
}

/**
 * Hook para buscar perfis PDV usando React Query.
 * Ideal para uso em formulários de usuários.
 */
export function usePerfisPDV() {
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<PerfilPDV[], ApiError>({
    queryKey: ['perfis-pdv'],
    queryFn: async () => {
      if (!isAuthenticated || !token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const response = await fetch('/api/perfis-pdv', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || 'Erro ao carregar perfis PDV',
          response.status,
          errorData
        )
      }

      const data = await response.json()
      const perfis = (data.items || []).map((item: any) => ({
        id: item.id?.toString() || '',
        role: item.role?.toString() || '',
      }))

      return perfis
    },
    enabled: isAuthenticated && !!token,
    staleTime: 1000 * 60 * 10, // 10 minutos (perfis mudam pouco)
  })
}





