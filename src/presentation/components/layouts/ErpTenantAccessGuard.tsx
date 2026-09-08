'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantAccessGuard } from '@/src/presentation/hooks/useTenantAccessGuard'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { SESSION_STORAGE_TENANT_LOGOUT_SELF } from '@/src/shared/constants/sessionCoordinator'
import {
  estaNaMesmaRotaLocal,
  irParaLoginDaSessaoAtual,
  urlHubDaSessaoAtual,
  urlLoginDaSessaoAtual,
} from '@/src/presentation/gestor-pedidos/sessao/pathsGestorSessao'
import {
  isRotaKioskPedidos,
  isRotaPedidos,
} from '@/src/presentation/gestor-pedidos/kiosk/isKioskGestorPedidos'
import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'

interface ErpTenantAccessGuardProps {
  children: ReactNode
}

/**
 * Guard centralizado de acesso ao ERP.
 * Integrado em ErpAppShell para proteger todas as rotas sob app/(erp)/.
 *
 * - Loading: exibe JiffyLoading enquanto a reidratação do store não concluiu.
 * - Sessão da empresa expirada com hub ok: `logoutTenant` → {@link HUB_PATH}.
 * - Sem sessão de empresa: {@link HUB_PATH}.
 * - Hub também inválido: `/login`.
 * - Sessão válida: renderiza children.
 */
export function ErpTenantAccessGuard({ children }: ErpTenantAccessGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { hasAccess, isLoading } = useTenantAccessGuard()
  const tenantAuth = useAuthStore(s => s.tenantAuth)

  const kioskFlow = isRotaKioskPedidos(
    pathname || (typeof window !== 'undefined' ? window.location.pathname : ''),
    typeof window !== 'undefined' ? window.location.search : ''
  )
  /** Flow: lista / quadro sem tenant. Identity curto não pode bloquear esta rota. */
  const kioskQuadroSemTenant = kioskFlow && !hasAccess

  useEffect(() => {
    if (isLoading || hasAccess) return
    if (kioskQuadroSemTenant) return

    try {
      if (sessionStorage.getItem(SESSION_STORAGE_TENANT_LOGOUT_SELF) === '1') {
        const identity = useAuthStore.getState().identityAuth
        if (!identity || identity.isExpired()) {
          irParaLoginDaSessaoAtual()
        }
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
          window.location.assign(urlHubDaSessaoAtual())
        })()
        return
      }
      const login = urlLoginDaSessaoAtual()
      if (!estaNaMesmaRotaLocal(login)) {
        router.replace(login)
      }
      return
    }

    const identity = useAuthStore.getState().identityAuth
    if (identity && !identity.isExpired()) {
      router.replace(urlHubDaSessaoAtual())
      return
    }
    const login = urlLoginDaSessaoAtual()
    if (!estaNaMesmaRotaLocal(login)) {
      router.replace(login)
    }
  }, [hasAccess, isLoading, kioskQuadroSemTenant, router, tenantAuth])

  if (kioskFlow || isRotaPedidos(stripGestaoEmpresaSlugFromPath(pathname ?? ''))) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-50">
        <JiffyLoading />
      </div>
    )
  }

  if (!hasAccess && !kioskQuadroSemTenant) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-50">
        <JiffyLoading />
      </div>
    )
  }

  return <>{children}</>
}
