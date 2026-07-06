'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { buildTenantQueryKey } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

/**
 * Hook genérico para prefetching de dados
 * Permite prefetch de qualquer entidade ao hover em links
 */
export function usePrefetch() {
  const queryClient = useQueryClient()
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const empresaId = useTenantEmpresaId()

  const prefetchProduto = useCallback(
    (id: string) => {
      const token = tenantAuth?.getAccessToken()
      if (!token || tenantAuth?.isExpired()) return

      queryClient.prefetchQuery({
        queryKey: buildTenantQueryKey(empresaId, ['produto', id]),
        queryFn: async () => {
          const response = await fetchGestorApi(`/api/produtos/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          if (!response.ok) throw new Error('Erro ao buscar produto')
          return response.json()
        },
        staleTime: 1000 * 60 * 5,
      })
    },
    [queryClient, tenantAuth, empresaId]
  )

  const prefetchCliente = useCallback(
    (id: string) => {
      const token = tenantAuth?.getAccessToken()
      if (!token || tenantAuth?.isExpired()) return

      queryClient.prefetchQuery({
        queryKey: buildTenantQueryKey(empresaId, ['cliente', id]),
        queryFn: async () => {
          const response = await fetchGestorApi(`/api/clientes/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          if (!response.ok) throw new Error('Erro ao buscar cliente')
          return response.json()
        },
        staleTime: 1000 * 60 * 5,
      })
    },
    [queryClient, tenantAuth, empresaId]
  )

  const prefetchUsuario = useCallback(
    (id: string) => {
      const token = tenantAuth?.getAccessToken()
      if (!token || tenantAuth?.isExpired()) return

      queryClient.prefetchQuery({
        queryKey: buildTenantQueryKey(empresaId, ['usuario', id]),
        queryFn: async () => {
          const response = await fetchGestorApi(`/api/usuarios/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          if (!response.ok) throw new Error('Erro ao buscar usuário')
          return response.json()
        },
        staleTime: 1000 * 60 * 5,
      })
    },
    [queryClient, tenantAuth, empresaId]
  )

  return {
    prefetchProduto,
    prefetchCliente,
    prefetchUsuario,
  }
}
