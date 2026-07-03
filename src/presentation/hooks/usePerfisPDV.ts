'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { showToast } from '@/src/shared/utils/toast'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

interface PerfilPDV {
  id: string
  role: string
}

/**
 * Hook para buscar perfis PDV usando React Query.
 * Ideal para uso em formulários de usuários.
 */
export function usePerfisPDV() {
  return useSecureTenantQuery<PerfilPDV[]>(
    ['perfis-pdv'],
    async ({ token }) => {
      const response = await fetchGestorApi('/api/perfis-pdv', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
      return (data.items || []).map((item: any) => ({
        id: item.id?.toString() || '',
        role: item.role?.toString() || '',
      }))
    },
    { staleTime: 1000 * 60 * 10 }
  )
}





