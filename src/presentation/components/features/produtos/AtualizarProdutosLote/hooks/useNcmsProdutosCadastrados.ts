'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
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
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const queryEnabled = enabled && isAuthenticated && !!token

  return useQuery<string[], ApiError>({
    queryKey: ['produtos', 'ncms-cadastrados', empresaId],
    queryFn: async () => {
      if (!token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const response = await fetch('/api/produtos/ncms-cadastrados', {
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
    enabled: queryEnabled,
    staleTime: 60_000,
  })
}
