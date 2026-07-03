'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'

/**
 * Em desenvolvimento, alerta no console quando existem queries no cache
 * sem o prefixo obrigatório `['tenant', empresaId, ...]`.
 * Sem efeito em produção.
 */
export function useDetectCacheLeaks() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    const queries = queryClient.getQueryCache().getAll()
    const leaked = queries.filter(q => {
      const key = q.queryKey
      return Array.isArray(key) && key[0] !== 'tenant'
    })

    if (leaked.length > 0) {
      console.warn(
        '[CacheLeak] Queries sem prefixo tenant detectadas:',
        leaked.map(q => q.queryKey)
      )
    }
  }, [queryClient, empresaId])
}
