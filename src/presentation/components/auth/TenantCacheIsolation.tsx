'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'

/**
 * Limpa automaticamente o cache do React Query quando o `tenantAuth` muda
 * (troca de empresa, logout de tenant, etc.).
 *
 * Sem isso, queryKeys idênticas entre empresas poderiam servir dados
 * da empresa anterior caso o `queryClient.clear()` imperativo não fosse
 * chamado (edge case em cross-tab sync, fallback de sessão, etc.).
 */
export function TenantCacheIsolation() {
  const queryClient = useQueryClient()
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const prevTokenRef = useRef<string | null>(null)

  useEffect(() => {
    const currentToken = tenantAuth?.getAccessToken() ?? null

    if (prevTokenRef.current === null) {
      prevTokenRef.current = currentToken
      return
    }

    if (currentToken !== prevTokenRef.current) {
      queryClient.clear()
      prevTokenRef.current = currentToken
    }
  }, [tenantAuth, queryClient])

  return null
}
