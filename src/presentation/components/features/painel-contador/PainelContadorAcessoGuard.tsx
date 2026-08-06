'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantAccessGuard } from '@/src/presentation/hooks/useTenantAccessGuard'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { HUB_PATH } from '@/src/shared/constants/hubRoutes'

interface PainelContadorAcessoGuardProps {
  children: React.ReactNode
}

/**
 * Restringe o painel do contador a perfis com acessoFiscal.
 * Enquanto o claim não estiver no token, permite acesso (compatibilidade).
 */
export function PainelContadorAcessoGuard({ children }: PainelContadorAcessoGuardProps) {
  const router = useRouter()  const { hasAccess, isLoading } = useTenantAccessGuard()

  useEffect(() => {
    if (isLoading || !hasAccess || !useAuthStore.getState().tenantAuth) return

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) return

    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as {
        acessoFiscal?: boolean
      }
      if (payload.acessoFiscal === false) {
        showToast.warning('Seu perfil não possui acesso ao Painel do Contador.')
        router.replace(HUB_PATH)
      }
    } catch {
      // Sem claim no JWT: mantém compatibilidade com sessões atuais
    }
  }, [ hasAccess, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  return <>{children}</>
}
