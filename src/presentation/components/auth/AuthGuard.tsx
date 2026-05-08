'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

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
export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname()
  const { isAuthenticated, auth, isRehydrated, logout } = useAuthStore()
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

  useEffect(() => {
    if (!isRehydrated) {
      return
    }

    const publicRoutes = ['/login', '/notas-fiscais']
    const isPublicRoute = publicRoutes.some(
      route => pathname === route || pathname?.startsWith(route)
    )

    if (isPublicRoute) {
      setAllowed(true)
      return
    }

    const isValid = isAuthenticated && auth !== null && !auth.isExpired()

    if (!isValid) {
      void invalidateSessionToLogin()
      return
    }

    redirectingRef.current = false
    setAllowed(true)
  }, [isAuthenticated, auth, pathname, isRehydrated, invalidateSessionToLogin])

  useEffect(() => {
    if (!isRehydrated || !allowed) {
      return
    }

    const publicRoutes = ['/login', '/notas-fiscais']
    const isPublicRoute = publicRoutes.some(
      route => pathname === route || pathname?.startsWith(route)
    )
    if (isPublicRoute) {
      return
    }

    const checkExpired = () => {
      const { isAuthenticated: ok, auth: current } = useAuthStore.getState()
      if (!ok || current === null || current.isExpired()) {
        void invalidateSessionToLogin()
      }
    }

    const intervalId = window.setInterval(checkExpired, SESSAO_POLL_MS)

    const { auth: a } = useAuthStore.getState()
    let timeoutId: number | undefined
    if (a) {
      const msAteExp = a.getExpiresAt().getTime() - Date.now()
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
  }, [isRehydrated, allowed, auth, pathname, invalidateSessionToLogin])

  if (!isRehydrated || !allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  return <>{children}</>
}
