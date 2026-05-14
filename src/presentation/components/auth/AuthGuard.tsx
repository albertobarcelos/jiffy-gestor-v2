'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  SESSION_STORAGE_HUB_LOGOUT_SELF,
  SESSION_STORAGE_TENANT_LOGOUT_SELF,
} from '@/src/shared/constants/sessionCoordinator'
import { hasSessionNonce } from '@/src/shared/utils/tabSession'

function isHubLogoutInitiatorTab(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(SESSION_STORAGE_HUB_LOGOUT_SELF) === '1'
  } catch {
    return false
  }
}

function isTenantLogoutInProgress(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(SESSION_STORAGE_TENANT_LOGOUT_SELF) === '1'
  } catch {
    return false
  }
}

interface AuthGuardProps {
  children: React.ReactNode
}

/** Intervalo de checagem: expiração por relógio não altera referência no Zustand, então precisamos poll. */
const SESSAO_POLL_MS = 15_000
/** Não agendar timeout além disso (evita timers absurdos se relógio/`expiresAt` vier errado). */
const SESSAO_TIMEOUT_MAX_MS = 1000 * 60 * 60 * 24 * 14

/**
 * Proteção de rotas no cliente: exige sessão válida e não expirada.
 * Chama logout (limpa cookie httpOnly + estado) antes de redirecionar ao login.
 * Aguarda reidratação do Zustand para evitar falsos positivos após reload.
 *
 * Além da checagem na montagem/atualização do store, faz **poll** e **timeout** na data
 * de `expiresAt` — assim, se o JWT expira com o usuário parado na mesma página, ainda
 * redireciona ao login (o efeito do Zustand sozinho não reexecuta só pelo passar do tempo).
 */
const PUBLIC_PREFIXES = [
  '/login',
  '/registro',
  '/confirmar-email',
  '/esqueci-senha',
  '/redefinir-senha',
  '/notas-fiscais',
]

function isPublicPath(p: string | null): boolean {
  if (!p) return false
  return PUBLIC_PREFIXES.some(r => p === r || p.startsWith(`${r}/`))
}

function isHubPath(p: string | null): boolean {
  return p?.startsWith('/meus-apps') ?? false
}

/** ERP: sessão da empresa (tenant JWT) é independente da identidade do hub. */
function isTenantSessionValid(t: ReturnType<typeof useAuthStore.getState>['tenantAuth']): boolean {
  return t !== null && !t.isExpired()
}

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const auth = useAuthStore(s => s.auth)
  const identityAuth = useAuthStore(s => s.identityAuth)
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const logout = useAuthStore(s => s.logout)
  const [allowed, setAllowed] = useState(false)
  const redirectingRef = useRef(false)

  const invalidateSessionToLogin = useCallback(async () => {
    if (redirectingRef.current) {
      return
    }
    redirectingRef.current = true
    try {
      await logout()
    } catch (error) {
      console.error('AuthGuard: erro ao encerrar sessão antes do login:', error)
    }
    window.location.href = '/login'
  }, [logout])

  const redirectHubSemIdentidade = useCallback(() => {
    if (redirectingRef.current) {
      return
    }
    redirectingRef.current = true
    window.location.href = '/login'
  }, [])

  const redirectToMeusApps = useCallback(() => {
    if (redirectingRef.current) {
      return
    }
    redirectingRef.current = true
    window.location.href = '/meus-apps'
  }, [])

  useEffect(() => {
    if (!isRehydrated) {
      return
    }

    if (isPublicPath(pathname)) {
      setAllowed(true)
      return
    }

    const isHub = isHubPath(pathname)

    if (isHub) {
      if (identityAuth !== null && !identityAuth.isExpired()) {
        redirectingRef.current = false
        setAllowed(true)
        return
      }
      if (isHubLogoutInitiatorTab()) {
        setAllowed(true)
        return
      }
      redirectHubSemIdentidade()
      return
    }

    /**
     * Não usar só `auth` (tenant ?? identidade): se o campo estiver dessincronizado
     * ou a identidade expirar, `auth.isExpired()` pode derrubar o ERP indevidamente
     * e disparar `logout()` — que apaga o `tenant-token` em **todas** as abas.
     */
    if (isTenantSessionValid(tenantAuth)) {
      redirectingRef.current = false
      setAllowed(true)
      return
    }

    if (!isAuthenticated || auth === null || auth.isExpired()) {
      void invalidateSessionToLogin()
      return
    }

    if (!tenantAuth && !hasSessionNonce()) {
      if (isTenantLogoutInProgress()) {
        try {
          sessionStorage.removeItem(SESSION_STORAGE_TENANT_LOGOUT_SELF)
        } catch { /* noop */ }
      }
      if (identityAuth) {
        redirectToMeusApps()
      } else {
        void invalidateSessionToLogin()
      }
      return
    }

    redirectingRef.current = false
    setAllowed(true)
  }, [
    isAuthenticated,
    auth,
    identityAuth,
    tenantAuth,
    pathname,
    isRehydrated,
    invalidateSessionToLogin,
    redirectHubSemIdentidade,
    redirectToMeusApps,
  ])

  useEffect(() => {
    if (!isRehydrated || !allowed) {
      return
    }

    if (isPublicPath(pathname)) {
      return
    }

    const isHub = isHubPath(pathname)

    const checkExpired = () => {
      const st = useAuthStore.getState()
      if (isHub) {
        if (isHubLogoutInitiatorTab()) {
          return
        }
        const id = st.identityAuth
        if (id === null || id.isExpired()) {
          redirectHubSemIdentidade()
        }
        return
      }
      if (isTenantSessionValid(st.tenantAuth)) {
        return
      }
      const { isAuthenticated: ok, auth: current } = st
      if (!ok || current === null || current.isExpired()) {
        void invalidateSessionToLogin()
      }
    }

    const intervalId = window.setInterval(checkExpired, SESSAO_POLL_MS)

    const st = useAuthStore.getState()
    const watchAuth = isHub ? st.identityAuth : (st.tenantAuth ?? st.auth)
    let timeoutId: number | undefined
    if (watchAuth) {
      const msAteExp = watchAuth.getExpiresAt().getTime() - Date.now()
      if (msAteExp > 0 && msAteExp < SESSAO_TIMEOUT_MAX_MS) {
        timeoutId = window.setTimeout(checkExpired, msAteExp + 750)
      }
    }

    return () => {
      window.clearInterval(intervalId)
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [
    isRehydrated,
    allowed,
    auth,
    identityAuth,
    pathname,
    invalidateSessionToLogin,
    redirectHubSemIdentidade,
  ])

  if (!isRehydrated || !allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  return <>{children}</>
}

