'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId, useTenantQueryKey } from '@/src/presentation/hooks/useTenantQueryKey'

/**
 * Contexto seguro injetado em toda query multi-tenant.
 * `token` = JWT da empresa desta aba; `empresaId` = claim do JWT.
 */
export type TenantQueryContext = {
  token: string
  empresaId: string
}

export type TenantQueryFn<T> = (ctx: TenantQueryContext) => Promise<T>

export type UseSecureTenantQueryOptions<T> = Omit<
  UseQueryOptions<T, Error, T>,
  'queryKey' | 'queryFn'
> & {
  /**
   * Condição adicional do consumidor. É combinada com AND à verificação
   * interna de segurança — nunca a substitui.
   */
  enabled?: boolean
}

/**
 * Hook obrigatório para consultas de dados por empresa (ERP).
 *
 * Segue a mesma filosofia do modelo Omie multi-tenant por aba:
 * - Bloqueia execução quando não há sessão de empresa válida nesta aba
 * - Inclui `empresaId` automaticamente na query key (isolamento de cache por empresa)
 * - Compatível com `fetchGestorApi` para refresh transparente de token em 401
 *
 * @example
 * const { data, isLoading } = useSecureTenantQuery(
 *   ['produtos'],
 *   ({ token }) =>
 *     fetchGestorApi('/api/produtos', {
 *       headers: { Authorization: `Bearer ${token}` },
 *     }).then(r => r.json())
 * )
 */
export function useSecureTenantQuery<T>(
  baseKey: readonly unknown[],
  queryFn: TenantQueryFn<T>,
  options?: UseSecureTenantQueryOptions<T>
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

  // Merge: opções externas podem restringir ainda mais (ex.: `enabled: !!id`),
  // mas nunca bypassar a verificação de segurança.
  const extraEnabled = options?.enabled !== undefined ? Boolean(options.enabled) : true
  const enabled = securityEnabled && extraEnabled

  return useQuery<T, Error>({
    queryKey,
    queryFn: () => {
      if (!token || !empresaId) {
        throw new Error('Sessão de empresa não encontrada')
      }
      return queryFn({ token, empresaId })
    },
    ...options,
    enabled,
  })
}
