'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * Proteção de rotas no cliente: exige sessão válida e não expirada.
 * Chama logout (limpa cookie httpOnly + estado) antes de redirecionar ao login.
 * Aguarda reidratação do Zustand para evitar falsos positivos após reload.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname()
  const { isAuthenticated, auth, isRehydrated, logout } = useAuthStore()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (!isRehydrated) {
      return
    }

    // Rotas públicas: não bloqueia (útil se o guard for reutilizado no root)
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
      void (async () => {
        try {
          await logout()
        } catch (error) {
          console.error('AuthGuard: erro ao encerrar sessão antes do login:', error)
        }
        window.location.href = '/login'
      })()
      return
    }

    setAllowed(true)
  }, [isAuthenticated, auth, pathname, isRehydrated, logout])

  if (!isRehydrated || !allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <JiffyLoading text="Verificando sessão..." />
      </div>
    )
  }

  return <>{children}</>
}
