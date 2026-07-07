'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  SESSION_STORAGE_HUB_LOGOUT_SELF,
  SESSION_STORAGE_TENANT_LOGOUT_SELF,
} from '@/src/shared/constants/sessionCoordinator'

/**
 * Outra guia encerrou a sessão da empresa (tenant): avisa e fecha esta guia (com fallback).
 */
export function EmpresaSessionLostGate() {
  const pathname = usePathname()
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const identityAuth = useAuthStore(s => s.identityAuth)
  const prevTenant = useRef<typeof tenantAuth>(null)
  const skipInitialSync = useRef(true)

  useEffect(() => {
    if (!pathname || pathname.startsWith('/meus-apps') || pathname === '/perfil' || pathname.startsWith('/perfil/')) {
      prevTenant.current = tenantAuth
      skipInitialSync.current = true
      return
    }

    const publicPrefixes = [
      '/login',
      '/registro',
      '/esqueci-senha',
      '/redefinir-senha',
      '/confirmar-email',
      '/notas-fiscais',
      '/cardapio',
    ]
    if (publicPrefixes.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_TENANT_LOGOUT_SELF)
        sessionStorage.removeItem(SESSION_STORAGE_HUB_LOGOUT_SELF)
      } catch {
        /* noop */
      }
      prevTenant.current = tenantAuth
      skipInitialSync.current = true
      return
    }

    if (skipInitialSync.current) {
      skipInitialSync.current = false
      prevTenant.current = tenantAuth
      return
    }

    let skipSelfLogout = false
    try {
      skipSelfLogout = sessionStorage.getItem(SESSION_STORAGE_TENANT_LOGOUT_SELF) === '1'
    } catch {
      skipSelfLogout = false
    }

    const hadTenant = prevTenant.current !== null
    const tenantGone = tenantAuth === null

    if (hadTenant && tenantGone && !skipSelfLogout) {
      window.alert(
        'O acesso a esta empresa foi encerrado em outra guia ou a sessão foi finalizada.'
      )
      try {
        window.close()
      } catch {
        /* noop */
      }
      window.setTimeout(() => {
        if (typeof document === 'undefined' || document.visibilityState !== 'visible') {
          return
        }
        if (identityAuth) {
          window.location.assign('/meus-apps')
        } else {
          window.location.assign('/login')
        }
      }, 200)
    }

    prevTenant.current = tenantAuth
  }, [tenantAuth, pathname, identityAuth])

  return null
}
