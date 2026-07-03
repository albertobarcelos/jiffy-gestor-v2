'use client'

import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'

export interface TenantAccessGuard {
  /** Sessão de empresa válida e ativa nesta aba. */
  hasAccess: boolean
  /** Mensagem de erro quando `hasAccess === false` e `!isLoading`. */
  accessError: string | null
  /** Enquanto a reidratação do store não concluiu. */
  isLoading: boolean
  /** `empresaId` extraído do JWT do tenant. `null` quando não há sessão. */
  currentTenantId: string | null
}

/**
 * Guard de acesso multi-tenant por página (estilo Omie).
 *
 * Valida se existe sessão de empresa ativa e não expirada nesta aba.
 * Deve ser usado em todas as páginas ERP antes de renderizar conteúdo sensível.
 *
 * Camada 5 da arquitetura multi-tenant: validação no ponto de uso,
 * complementando o `AuthGuard` global (que só libera a rota).
 *
 * @example
 * export function MinhaPagina() {
 *   const { hasAccess, accessError, isLoading } = useTenantAccessGuard()
 *
 *   if (isLoading) return <JiffyLoading />
 *   if (!hasAccess) return <p className="text-error">{accessError}</p>
 *
 *   return <ConteudoProtegido />
 * }
 */
export function useTenantAccessGuard(): TenantAccessGuard {
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const empresaId = useTenantEmpresaId()

  const isLoading = !isRehydrated

  let hasAccess = false
  let accessError: string | null = null

  if (isRehydrated) {
    if (!isAuthenticated || !tenantAuth) {
      accessError = 'Sessão não encontrada. Faça login.'
    } else if (tenantAuth.isExpired()) {
      accessError = 'Sessão expirada. Faça login novamente.'
    } else if (!empresaId) {
      accessError = 'Empresa não identificada no token.'
    } else {
      hasAccess = true
    }
  }

  return {
    hasAccess,
    accessError,
    isLoading,
    currentTenantId: empresaId,
  }
}
