'use client'

import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId, useTenantQueryKey } from '@/src/presentation/hooks/useTenantQueryKey'
import type { TenantQueryContext } from '@/src/presentation/hooks/useSecureTenantQuery'

export type TenantInfiniteQueryFn<TData, TPageParam> = (
  ctx: TenantQueryContext,
  pageParam: TPageParam
) => Promise<TData>

type SecureInfiniteOptions<TData, TPageParam> = Omit<
  UseInfiniteQueryOptions<TData, Error, InfiniteData<TData>, readonly unknown[], TPageParam>,
  'queryKey' | 'queryFn'
> & {
  /**
   * Condição adicional do consumidor. É combinada com AND à verificação
   * interna de segurança — nunca a substitui.
   */
  enabled?: boolean
}

/**
 * Espelho de `useSecureTenantQuery` para paginação infinita.
 * Usa somente `tenantAuth` e prefixa a key com `['tenant', empresaId, ...]`.
 */
export function useSecureTenantInfiniteQuery<TData, TPageParam = number>(
  baseKey: readonly unknown[],
  queryFn: TenantInfiniteQueryFn<TData, TPageParam>,
  options: SecureInfiniteOptions<TData, TPageParam>
) {
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const empresaId = useTenantEmpresaId()
  const queryKey = useTenantQueryKey(baseKey)

  const token = tenantAuth?.getAccessToken() ?? null
  const securityEnabled =
    isRehydrated &&
    isAuthenticated &&
    !!token &&
    !!empresaId &&
    !(tenantAuth?.isExpired() ?? true)

  const extraEnabled = options.enabled !== undefined ? Boolean(options.enabled) : true
  const enabled = securityEnabled && extraEnabled

  return useInfiniteQuery<TData, Error, InfiniteData<TData>, readonly unknown[], TPageParam>({
    ...options,
    queryKey,
    queryFn: ({ pageParam }) => {
      if (!token || !empresaId) {
        throw new Error('Sessão de empresa não encontrada')
      }
      return queryFn({ token, empresaId }, pageParam as TPageParam)
    },
    enabled,
  })
}
