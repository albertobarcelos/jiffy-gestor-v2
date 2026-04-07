'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * Componente de proteção de rotas no cliente
 * Redireciona para login se usuário não estiver autenticado
 * O middleware já faz a proteção principal, este é apenas uma camada extra
 * 
 * IMPORTANTE: Aguarda a reidratação do Zustand antes de verificar autenticação
 * para evitar redirecionamentos incorretos após reload da página
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, auth, isRehydrated } = useAuthStore()

  useEffect(() => {
    // Não fazer nada até que o Zustand tenha reidratado
    if (!isRehydrated) {
      return
    }

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
        console.warn('AuthGuard: Usuário não autenticado, redirecionando para login', {
          isAuthenticated,
          auth: auth ? 'presente' : 'null',
          expired: auth ? auth.isExpired() : 'N/A',
          pathname,
          isRehydrated
        })
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação no AuthGuard:', error)
      // Não redirecionar automaticamente em caso de erro - pode ser erro temporário
      // Apenas logar o erro para diagnóstico
    }
  }, [isAuthenticated, auth, pathname, isRehydrated])

  // Renderiza children (middleware já faz a proteção principal)
  // Se ainda não reidratou, renderiza normalmente (o middleware já protege)
  return <>{children}</>
}

