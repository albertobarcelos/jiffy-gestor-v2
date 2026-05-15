'use client'

import { useMemo } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { extractTokenInfo } from '@/src/shared/utils/validateToken'

/**
 * Extrai o `empresaId` do JWT do tenant ativo.
 * Retorna `null` quando não existe sessão de empresa (ex.: tela do hub).
 */
export function useTenantEmpresaId(): string | null {
  const tenantAuth = useAuthStore(s => s.tenantAuth)

  return useMemo(() => {
    if (!tenantAuth) return null
    const { empresaId } = extractTokenInfo(tenantAuth.getAccessToken())
    return empresaId ?? null
  }, [tenantAuth])
}

/**
 * Monta uma queryKey com o `empresaId` do tenant como primeiro segmento,
 * garantindo isolamento de cache entre empresas.
 *
 * @example
 * const qk = useTenantQueryKey(['produtos', { page: 1 }])
 * // → ['tenant', 'abc-123', 'produtos', { page: 1 }]
 */
export function useTenantQueryKey(baseKey: readonly unknown[]): readonly unknown[] {
  const empresaId = useTenantEmpresaId()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ['tenant', empresaId, ...baseKey], [empresaId, JSON.stringify(baseKey)])
}
