'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { Auth } from '@/src/domain/entities/Auth'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { buildAuthFromAccessToken } from '@/src/shared/utils/buildAuthFromAccessToken'
import { getTabTenantToken, hasSessionNonce } from '@/src/shared/utils/tabSession'
import { fetchTenantRefreshAccessToken } from '@/src/shared/utils/fetchTenantRefreshAccessToken'
import { syncTenantAccessTokenClient } from '@/src/presentation/utils/syncTenantAccessTokenClient'
import {
  SESSION_STORAGE_HUB_LOGOUT_SELF,
  SESSION_STORAGE_TENANT_LOGOUT_SELF,
  JIFFY_SESSION_EXPIRED_EVENT,
} from '@/src/shared/constants/sessionCoordinator'

/** Tempo máximo de espera para o refresh de token antes de forçar logout. */
const REFRESH_TIMEOUT_MS = 5_000

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
  if (!p) return false
  /** Perfil da conta: só identidade de hub (como Meus Apps), sem empresa nesta aba. */
  if (p === '/perfil' || p.startsWith('/perfil/')) return true
  return p.startsWith('/meus-apps')
}

/**
 * JWT da empresa (tenant) ainda válido nesta aba — Zustand e/ou `sessionStorage` (prepareTabSession).
 * Independente do JWT de identidade (hub).
 */
function getActiveTenantAuthOrNull(): Auth | null {
  const st = useAuthStore.getState()
  const t = st.tenantAuth
  if (t !== null && !t.isExpired()) {
    return t
  }
  const raw = getTabTenantToken()
  if (!raw) return null
  try {
    const u = st.identityAuth?.getUser()
    const built = buildAuthFromAccessToken(
      raw,
      u ? { id: u.getId(), email: u.getEmail(), name: u.getName() } : undefined
    )
    return built.isExpired() ? null : built
  } catch {
    return null
  }
}

function isTenantSessionAlive(): boolean {
  return getActiveTenantAuthOrNull() !== null
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
    // Limpar cookie de identidade antes de redirecionar (sem await para não bloquear o redirect)
    void fetch('/api/auth/logout-hub', { method: 'POST', credentials: 'include' }).catch(() => { /* noop */ })
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
    // Rotas públicas: liberar imediatamente, sem esperar reidratação
    if (isPublicPath(pathname)) {
      setAllowed(true)
      return
    }

    if (!isRehydrated) {
      return
    }

    const isHub = isHubPath(pathname)

    if (isHub) {
      const tenantAlive = isTenantSessionAlive()
      if ((identityAuth !== null && !identityAuth.isExpired()) || tenantAlive) {
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
     * ERP: sessão da empresa (tenant JWT) é independente do JWT de identidade (hub).
     * Se `identityAuth` expirou mas ainda há tenant válido no Zustand ou no sessionStorage,
     * não chamar `logout()` — antes `auth` podia cair no identity expirado e limpava tudo,
     * disparando EmpresaSessionLostGate em abas com empresa aberta.
     */
    const tenantAliveErp = isTenantSessionAlive()
    if (tenantAliveErp) {
      const built = getActiveTenantAuthOrNull()
      if (built && useAuthStore.getState().tenantAuth === null) {
        useAuthStore.getState().setTenantAuth(built)
      }
      redirectingRef.current = false
      setAllowed(true)
      return
    }

    if (!isAuthenticated || auth === null || auth.isExpired()) {
      let cancelled = false
      void (async () => {
        // Race: refresh token vs. timeout de segurança (5 s)
        let timeoutHandle: number | undefined
        const timeoutPromise = new Promise<null>(resolve => {
          timeoutHandle = window.setTimeout(() => resolve(null), REFRESH_TIMEOUT_MS)
        })
        const refreshed = await Promise.race([fetchTenantRefreshAccessToken(), timeoutPromise])
        window.clearTimeout(timeoutHandle)

        if (cancelled) {
          return
        }
        if (refreshed) {
          try {
            syncTenantAccessTokenClient(refreshed)
            redirectingRef.current = false
            setAllowed(true)
          } catch {
            void invalidateSessionToLogin()
          }
          return
        }
        void invalidateSessionToLogin()
      })()
      return () => {
        cancelled = true
      }
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
        if (isTenantSessionAlive()) {
          return
        }
        const id = st.identityAuth
        if (id === null || id.isExpired()) {
          redirectHubSemIdentidade()
        }
        return
      }
      if (isTenantSessionAlive()) {
        const built = getActiveTenantAuthOrNull()
        if (built && st.tenantAuth === null) {
          useAuthStore.getState().setTenantAuth(built)
        }
        return
      }
      const { isAuthenticated: ok, auth: current } = st
      if (!ok || current === null || current.isExpired()) {
        void (async () => {
          let timeoutHandle: number | undefined
          const timeoutPromise = new Promise<null>(resolve => {
            timeoutHandle = window.setTimeout(() => resolve(null), REFRESH_TIMEOUT_MS)
          })
          const refreshed = await Promise.race([fetchTenantRefreshAccessToken(), timeoutPromise])
          window.clearTimeout(timeoutHandle)
          if (refreshed) {
            try {
              syncTenantAccessTokenClient(refreshed)
            } catch {
              void invalidateSessionToLogin()
            }
            return
          }
          void invalidateSessionToLogin()
        })()
      }
    }

    const intervalId = window.setInterval(checkExpired, SESSAO_POLL_MS)

    const st = useAuthStore.getState()
    const tenantA = getActiveTenantAuthOrNull()
    /** Mesma prioridade hub/ERP: expiração do tenant (empresa) não deve seguir o relógio do identity. */
    const watchAuth = tenantA ?? st.identityAuth
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
    tenantAuth,
    pathname,
    invalidateSessionToLogin,
    redirectHubSemIdentidade,
  ])

  /** Listener centralizado: fetchGestorApi dispara este evento quando o refresh falha. */
  useEffect(() => {
    const handleSessionExpired = () => {
      void invalidateSessionToLogin()
    }
    window.addEventListener(JIFFY_SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(JIFFY_SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [invalidateSessionToLogin])

  // Rotas públicas: renderizar imediatamente sem checar autenticação
  if (isPublicPath(pathname)) {
    return <>{children}</>
  }

  if (!isRehydrated || !allowed) {
    if (isHubPath(pathname)) {
      return <div className="min-h-screen bg-[#fafafa]" />
    }
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  return <>{children}</>
}

