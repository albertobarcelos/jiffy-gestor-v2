'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * Componente de proteção de rotas no cliente
 * Redireciona para login se usuário não estiver autenticado
 * O middleware já faz a proteção principal, este é apenas uma camada extra
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, auth } = useAuthStore()

  useEffect(() => {
    // Rotas públicas que não precisam de autenticação
    const publicRoutes = ['/login']
    const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname?.startsWith(route))

    // Se é rota pública, não faz nada
    if (isPublicRoute) {
      return
    }

    // Verifica se está autenticado
    try {
      const isAuth = isAuthenticated && auth !== null && !auth.isExpired()

      // Se não está autenticado, redireciona para login
      if (!isAuth) {
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error)
      window.location.href = '/login'
    }
  }, [isAuthenticated, auth, pathname])

  // Renderiza children (middleware já faz a proteção principal)
  return <>{children}</>
}

