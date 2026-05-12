'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  JIFFY_SESSION_BROADCAST_CHANNEL,
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

    if (!isAuthenticated || auth === null || auth.isExpired()) {
      void invalidateSessionToLogin()
      return
    }

    if (!tenantAuth && !hasSessionNonce()) {
      if (isTenantLogoutInProgress()) {
        setAllowed(false)
        return
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
      const { isAuthenticated: ok, auth: current } = st
      if (!ok || current === null || current.isExpired()) {
        void invalidateSessionToLogin()
      }
    }

    const intervalId = window.setInterval(checkExpired, SESSAO_POLL_MS)

    const st = useAuthStore.getState()
    const watchAuth = isHub ? st.identityAuth : st.auth
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
    if (isRehydrated && isTenantLogoutInProgress()) {
      return <TenantSessionEndedScreen />
    }

    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  return <>{children}</>
}

function TenantSessionEndedScreen() {
  const [hubAlive, setHubAlive] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    async function check() {
      let alive = false
      try {
        const bc = new BroadcastChannel(JIFFY_SESSION_BROADCAST_CHANNEL)
        alive = await new Promise<boolean>(resolve => {
          const timer = window.setTimeout(() => resolve(false), 400)
          bc.onmessage = (ev: MessageEvent<{ type?: string }>) => {
            if (ev.data?.type === 'hub-pong') {
              window.clearTimeout(timer)
              resolve(true)
            }
          }
          bc.postMessage({ type: 'hub-ping', ts: Date.now() })
        })
        bc.close()
      } catch { /* noop */ }
      if (!cancelled) setHubAlive(alive)
    }
    void check()
    return () => { cancelled = true }
  }, [])

  const handleNavigateToHub = () => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_TENANT_LOGOUT_SELF)
    } catch { /* noop */ }
    window.location.assign('/meus-apps')
  }

  if (hubAlive === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-4 flex max-w-sm flex-col items-center gap-5 rounded-xl bg-white p-8 shadow-lg">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-7 w-7 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Sessão encerrada
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {hubAlive
              ? 'O acesso a esta empresa foi encerrado. Você já possui a aba Meus Apps aberta — pode fechar esta aba.'
              : 'O acesso a esta empresa foi encerrado com sucesso.'}
          </p>
        </div>

        {!hubAlive && (
          <div className="flex w-full flex-col gap-2">
            <button
              type="button"
              onClick={handleNavigateToHub}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Ir para Meus Apps
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
