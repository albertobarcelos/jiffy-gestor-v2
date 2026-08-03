'use client'

import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/src/presentation/stores/authStore'

const TOAST_ID = 'hub-identity-expiring'
/** Avisa quando faltam menos de 5 minutos para o JWT do hub expirar. */
const WARN_BEFORE_MS = 5 * 60 * 1000

/**
 * No ERP, a sessão da empresa pode continuar válida com o hub já expirado.
 * Este aviso prepara o usuário antes de clicar em Meu Jiffy e cair no login.
 */
export function useHubIdentityExpiryWarning(enabled = true): void {
  const identityAuth = useAuthStore(s => s.identityAuth)
  const warnedRef = useRef(false)

  useEffect(() => {
    if (!enabled || !identityAuth) {
      return
    }

    const check = () => {
      if (warnedRef.current) {
        return
      }
      const msLeft = identityAuth.getExpiresAt().getTime() - Date.now()
      if (msLeft <= 0) {
        warnedRef.current = true
        toast.error(
          'Sessão do Meu Jiffy expirada. Ao sair da empresa, será necessário entrar novamente.',
          { id: TOAST_ID, duration: 8000 }
        )
        return
      }
      if (msLeft <= WARN_BEFORE_MS) {
        warnedRef.current = true
        toast(
          'Sessão do Meu Jiffy expira em breve. Salve o trabalho antes de trocar de empresa.',
          { id: TOAST_ID, duration: 8000 }
        )
      }
    }

    check()
    const interval = window.setInterval(check, 30_000)
    return () => window.clearInterval(interval)
  }, [enabled, identityAuth])

  useEffect(() => {
    if (identityAuth && !identityAuth.isExpired()) {
      const msLeft = identityAuth.getExpiresAt().getTime() - Date.now()
      if (msLeft > WARN_BEFORE_MS) {
        warnedRef.current = false
      }
    }
  }, [identityAuth])
}
