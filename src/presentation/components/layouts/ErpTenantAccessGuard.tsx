'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantAccessGuard } from '@/src/presentation/hooks/useTenantAccessGuard'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

interface ErpTenantAccessGuardProps {
  children: ReactNode
}

/**
 * Guard centralizado de acesso ao ERP.
 * Integrado em ErpAppShell para proteger todas as rotas sob app/(erp)/.
 *
 * - Loading: exibe JiffyLoading enquanto a reidratação do store não concluiu.
 * - Sessão expirada: redireciona para /login.
 * - Sem sessão de empresa (acesso não autorizado): redireciona para /meus-apps.
 * - Sessão válida: renderiza children.
 */
export function ErpTenantAccessGuard({ children }: ErpTenantAccessGuardProps) {
  const router = useRouter()
  const { hasAccess, isLoading } = useTenantAccessGuard()
  const tenantAuth = useAuthStore(s => s.tenantAuth)

  useEffect(() => {
    if (isLoading || hasAccess) return

    if (tenantAuth?.isExpired()) {
      router.replace('/login')
    } else {
      router.replace('/meus-apps')
    }
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
