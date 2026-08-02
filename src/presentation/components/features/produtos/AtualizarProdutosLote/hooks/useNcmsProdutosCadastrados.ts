'use client'

import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { ApiError } from '@/src/infrastructure/api/apiClient'

type NcmsCadastradosResponse = {
  success?: boolean
  ncms?: string[]
  message?: string
}

/**
 * NCMs distintos já cadastrados nos produtos da empresa (para filtro da aba fiscal).
 */
export function useNcmsProdutosCadastrados(enabled = true) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  return useSecureTenantQuery(
    ['produtos', 'ncms-cadastrados'],
    async ({ token }) => {
      const response = await fetchGestorApi('/api/produtos/ncms-cadastrados', {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as NcmsCadastradosResponse
        throw new ApiError(
          errorData.message || 'Erro ao listar NCMs cadastrados',
          response.status,
          errorData
        )
      }

      const data = (await response.json()) as NcmsCadastradosResponse
      return Array.isArray(data.ncms) ? data.ncms : []
    },
    {
      enabled: enabled && isAuthenticated,
      staleTime: 60_000,
    }
  )
}
