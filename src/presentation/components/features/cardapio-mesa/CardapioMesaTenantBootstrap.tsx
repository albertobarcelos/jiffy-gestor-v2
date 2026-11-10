'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  bootstrapTabSessionManually,
  getEmpresaSlugParam,
  getTabEmpresaId,
  getTabTenantToken,
} from '@/src/shared/utils/tabSession'
import {
  buildAuthFromAccessToken,
  isEmailSessaoPlaceholder,
} from '@/src/shared/utils/buildAuthFromAccessToken'
import { extractTokenInfo } from '@/src/shared/utils/validateToken'
import { fetchTenantRefreshAccessToken } from '@/src/shared/utils/fetchTenantRefreshAccessToken'
import { syncTenantAccessTokenClient } from '@/src/presentation/utils/syncTenantAccessTokenClient'
import { fetchAccessTokenEscolherEmpresa } from '@/src/presentation/utils/escolherEmpresaApi'
import { ensureHubBearerToken } from '@/src/presentation/utils/ensureHubBearerToken'

/**
 * V1 preview: `/cardapio-mesa` não tem `/gestao/{slug}`, então o TabSessionBootstrap
 * não rebinda. Aqui reaproveitamos o JWT da empresa já aberto nesta aba (sessionStorage)
 * ou o cookie de refresh / escolher-empresa — o mesmo tenant do pedido balcão.
 */
export function CardapioMesaTenantBootstrap({ children }: { children: ReactNode }) {
  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isRehydrated) return

    let cancelled = false

    const activate = (token: string): boolean => {
      const prev = useAuthStore.getState().getUser()
      if (!prev || isEmailSessaoPlaceholder(prev.getEmail())) {
        return syncTenantAccessTokenClient(token)
      }
      try {
        const auth = buildAuthFromAccessToken(token, {
          id: prev.getId(),
          email: prev.getEmail(),
          name: prev.getName(),
        })
        const { empresaId } = extractTokenInfo(token)
        const slug = getEmpresaSlugParam()
        if (empresaId) {
          bootstrapTabSessionManually(token, slug ?? 'empresa', empresaId)
        }
        useAuthStore.getState().setTenantAuth(auth)
        useAuthStore.getState().setTabVerified(true)
        return true
      } catch {
        return syncTenantAccessTokenClient(token)
      }
    }

    const run = async () => {
      if (useAuthStore.getState().tenantAuth && !useAuthStore.getState().tenantAuth?.isExpired()) {
        if (!cancelled) setReady(true)
        return
      }

      const existing = getTabTenantToken()
      if (existing && activate(existing)) {
        if (!cancelled) setReady(true)
        return
      }

      const refreshed = await fetchTenantRefreshAccessToken(getTabEmpresaId())
      if (cancelled) return
      if (refreshed && activate(refreshed)) {
        setReady(true)
        return
      }

      const empresaId =
        getTabEmpresaId() ||
        useAuthStore.getState().hubEmpresas?.[0]?.id ||
        null

      if (empresaId) {
        try {
          const hubBearer = await ensureHubBearerToken()
          if (cancelled) return
          const accessToken = await fetchAccessTokenEscolherEmpresa(
            empresaId,
            hubBearer?.token
          )
          if (cancelled) return
          if (activate(accessToken)) {
            setReady(true)
            return
          }
        } catch {
          /* catalogo mostra login */
        }
      }

      if (!cancelled) setReady(true)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [isRehydrated, tenantAuth])

  if (!isRehydrated || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500" />
      </div>
    )
  }

  return <>{children}</>
}
