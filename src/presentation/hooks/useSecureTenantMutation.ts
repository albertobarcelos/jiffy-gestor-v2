'use client'

import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'

/**
 * Contexto seguro injetado em toda mutation multi-tenant.
 * `token` = JWT da empresa desta aba; `empresaId` = claim do JWT.
 */
export type TenantMutationContext = {
  token: string
  empresaId: string
}

export type TenantMutationFn<TData, TVariables> = (
  ctx: TenantMutationContext,
  variables: TVariables
) => Promise<TData>

/**
 * Hook obrigatório para mutations de dados por empresa (ERP).
 *
 * Espelha `useSecureTenantQuery` para mutations — mesmas 5 camadas de segurança:
 * - Usa somente `tenantAuth` (JWT da aba), nunca `auth` (identity hub)
 * - Bloqueia execução se sessão de empresa inválida ou expirada
 * - Compatível com `fetchGestorApi` (auto-inject de token já presente)
 *
 * @example
 * const mutation = useSecureTenantMutation(
 *   ({ token }, data: { nome: string }) =>
 *     fetchGestorApi('/api/clientes', {
 *       method: 'POST',
 *       headers: { Authorization: `Bearer ${token}` },
 *       body: JSON.stringify(data),
 *     }).then(r => r.json())
 * )
 */
export function useSecureTenantMutation<TData = unknown, TVariables = void, TContext = unknown>(
  mutationFn: TenantMutationFn<TData, TVariables>,
  options?: Omit<UseMutationOptions<TData, Error, TVariables, TContext>, 'mutationFn'>
) {
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const empresaId = useTenantEmpresaId()

  return useMutation<TData, Error, TVariables, TContext>({
    ...options,
    mutationFn: (variables: TVariables) => {
      const token = tenantAuth?.getAccessToken() ?? null

      if (!isRehydrated || !isAuthenticated || !token || !empresaId || (tenantAuth?.isExpired() ?? true)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useSecureTenantMutation] Bloqueado — sessão inválida:', {
            isRehydrated,
            isAuthenticated,
            hasToken: !!token,
            hasEmpresaId: !!empresaId,
            isExpired: tenantAuth?.isExpired() ?? true,
          })
        }
        throw new Error('Sessão de empresa não encontrada. Faça login novamente.')
      }

      return mutationFn({ token, empresaId }, variables)
    },
  })
}
