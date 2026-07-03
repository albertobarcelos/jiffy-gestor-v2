'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantAccessGuard } from '@/src/presentation/hooks/useTenantAccessGuard'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

interface PainelContadorAcessoGuardProps {
  children: React.ReactNode
}

/**
 * Restringe o painel do contador a perfis com acessoFiscal.
 * Enquanto o claim não estiver no token, permite acesso (compatibilidade).
 */
export function PainelContadorAcessoGuard({ children }: PainelContadorAcessoGuardProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const { hasAccess, isLoading } = useTenantAccessGuard()

  useEffect(() => {
    if (isLoading || !hasAccess || !auth) return

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
  }, [auth, hasAccess, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  return <>{children}</>
}
