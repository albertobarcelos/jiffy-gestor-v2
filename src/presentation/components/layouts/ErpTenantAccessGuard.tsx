'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantAccessGuard } from '@/src/presentation/hooks/useTenantAccessGuard'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { SESSION_STORAGE_TENANT_LOGOUT_SELF } from '@/src/shared/constants/sessionCoordinator'

interface ErpTenantAccessGuardProps {
  children: ReactNode
}

/**
 * Guard centralizado de acesso ao ERP.
 * Integrado em ErpAppShell para proteger todas as rotas sob app/(erp)/.
 *
 * - Loading: exibe JiffyLoading enquanto a reidratação do store não concluiu.
 * - Sessão da empresa expirada com hub ok: `logoutTenant` → `/meus-apps`.
 * - Sem sessão de empresa: `/meus-apps`.
 * - Hub também inválido: `/login`.
 * - Sessão válida: renderiza children.
 */
export function ErpTenantAccessGuard({ children }: ErpTenantAccessGuardProps) {
  const router = useRouter()
  const { hasAccess, isLoading } = useTenantAccessGuard()
  const tenantAuth = useAuthStore(s => s.tenantAuth)

  useEffect(() => {
    if (isLoading || hasAccess) return

    try {
      if (sessionStorage.getItem(SESSION_STORAGE_TENANT_LOGOUT_SELF) === '1') {
        return
      }
    } catch {
      /* noop */
    }

    if (tenantAuth?.isExpired()) {
      const identity = useAuthStore.getState().identityAuth
      if (identity && !identity.isExpired()) {
        void (async () => {
          try {
            sessionStorage.setItem(SESSION_STORAGE_TENANT_LOGOUT_SELF, '1')
          } catch {
            /* noop */
          }
          try {
            await useAuthStore.getState().logoutTenant()
          } catch {
            /* noop */
          }
          window.location.assign('/meus-apps')
        })()
        return
      }
      router.replace('/login')
      return
    }

    const identity = useAuthStore.getState().identityAuth
    if (identity && !identity.isExpired()) {
      router.replace('/meus-apps')
      return
    }
    router.replace('/login')
  }, [hasAccess, isLoading, router, tenantAuth])

  if (isLoading || !hasAccess) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-50">
        <JiffyLoading />
      </div>
    )
  }

  return <>{children}</>
}
