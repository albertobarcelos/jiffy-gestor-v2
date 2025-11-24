'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'

/**
 * Hook genérico para prefetching de dados
 * Permite prefetch de qualquer entidade ao hover em links
 */
export function usePrefetch() {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()

  /**
   * Prefetch de produto por ID
   */
  const prefetchProduto = useCallback(
    (id: string) => {
      const token = auth?.getAccessToken()
      if (!token) return

      queryClient.prefetchQuery({
        queryKey: ['produto', id],
        queryFn: async () => {
          const response = await fetch(`/api/produtos/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          if (!response.ok) throw new Error('Erro ao buscar produto')
          const data = await response.json()
          return data
        },
        staleTime: 1000 * 60 * 5,
      })
    },
    [queryClient, auth]
  )

  /**
   * Prefetch de cliente por ID
   */
  const prefetchCliente = useCallback(
    (id: string) => {
      const token = auth?.getAccessToken()
      if (!token) return

      queryClient.prefetchQuery({
        queryKey: ['cliente', id],
        queryFn: async () => {
          const response = await fetch(`/api/clientes/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          if (!response.ok) throw new Error('Erro ao buscar cliente')
          const data = await response.json()
          return data
        },
        staleTime: 1000 * 60 * 5,
      })
    },
    [queryClient, auth]
  )

  /**
   * Prefetch de usuário por ID
   */
  const prefetchUsuario = useCallback(
    (id: string) => {
      const token = auth?.getAccessToken()
      if (!token) return

      queryClient.prefetchQuery({
        queryKey: ['usuario', id],
        queryFn: async () => {
          const response = await fetch(`/api/usuarios/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          if (!response.ok) throw new Error('Erro ao buscar usuário')
          const data = await response.json()
          return data
        },
        staleTime: 1000 * 60 * 5,
      })
    },
    [queryClient, auth]
  )

  return {
    prefetchProduto,
    prefetchCliente,
    prefetchUsuario,
  }
}

