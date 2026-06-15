'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'

interface PainelContadorAcessoGuardProps {
  children: React.ReactNode
}

/**
 * Restringe o painel do contador a perfis com acessoFiscal.
 * Enquanto o claim não estiver no token, permite acesso (compatibilidade).
 */
export function PainelContadorAcessoGuard({ children }: PainelContadorAcessoGuardProps) {
  const router = useRouter()
  const { auth, isRehydrated, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isRehydrated || !isAuthenticated || !auth) return

    const token = auth.getAccessToken()
    if (!token) return

    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as {
        acessoFiscal?: boolean
      }
      if (payload.acessoFiscal === false) {
        showToast.warning('Seu perfil não possui acesso ao Painel do Contador.')
        router.replace('/meus-apps')
      }
    } catch {
      // Sem claim no JWT: mantém compatibilidade com sessões atuais
    }
  }, [auth, isAuthenticated, isRehydrated, router])

  return <>{children}</>
}
