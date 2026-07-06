'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { buildAuthFromAccessToken } from '@/src/shared/utils/buildAuthFromAccessToken'
import {
  consumeTabSession,
  getTabTenantToken,
  extractEmpresaIdPrefix,
  bootstrapTabSessionManually,
} from '@/src/shared/utils/tabSession'
import { parseEmpresaSlugFromPath, parseEmpresaSlugFromSearch } from '@/src/shared/utils/gestaoRoutes'
import {
  SESSION_STORAGE_SESSION_NONCE,
  SESSION_STORAGE_EMPRESA_SLUG,
} from '@/src/shared/constants/sessionCoordinator'

type FallbackPending = { empresaId: string; empParam: string; tempNonce: string }

function getEmpParam(): string | null {
  try {
    const fromPath = parseEmpresaSlugFromPath(window.location.pathname)
    if (fromPath) return fromPath
    return parseEmpresaSlugFromSearch(window.location.search)
  } catch {
    return null
  }
}

/**
 * Montado no root layout. Restaura a sessão per-tab da empresa.
 *
 * Fluxo:
 * 1. `useLayoutEffect` (síncrono, roda ANTES de qualquer `useEffect`):
 *    - Consome pending session do localStorage (aba aberta pelo hub)
 *    - Ou restaura do sessionStorage (F5 / reload)
 *    - Ou prepara fallback escrevendo nonce temporário (URL colada)
 * 2. `useEffect` (assíncrono):
 *    - Se fallback foi preparado, chama `escolher-empresa` para obter token
 *    - Se falhar, redireciona para `/meus-apps`
 *
 * O `useLayoutEffect` garante que o nonce esteja no sessionStorage antes do
 * `AuthGuard` (que usa `useEffect`) verificar — evitando redirect prematuro.
 */
export function TabSessionBootstrap() {
  const setTenantAuth = useAuthStore(s => s.setTenantAuth)
  const identityAuth = useAuthStore(s => s.identityAuth)
  const hubEmpresas = useAuthStore(s => s.hubEmpresas)
  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const didRunRef = useRef(false)
  const fallbackRef = useRef<FallbackPending | null>(null)

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !isRehydrated || didRunRef.current) return

    const emp = getEmpParam()

    const consumed = consumeTabSession(emp)
    const token = consumed || getTabTenantToken()

    if (token) {
      didRunRef.current = true
      const prev = identityAuth?.getUser()
      const auth = buildAuthFromAccessToken(
        token,
        prev ? { id: prev.getId(), email: prev.getEmail(), name: prev.getName() } : undefined
      )
      setTenantAuth(auth)
      return
    }

    const idPrefix = extractEmpresaIdPrefix(emp)
    if (!idPrefix || !identityAuth || !hubEmpresas?.length) return

    const empresa = hubEmpresas.find(
      e => e.id.replace(/-/g, '').startsWith(idPrefix)
    )
    if (!empresa) return

    didRunRef.current = true

    const tempNonce = crypto.randomUUID()
    try {
      sessionStorage.setItem(SESSION_STORAGE_SESSION_NONCE, tempNonce)
      sessionStorage.setItem(SESSION_STORAGE_EMPRESA_SLUG, emp!)
    } catch { /* ignore */ }

    fallbackRef.current = { empresaId: empresa.id, empParam: emp!, tempNonce }
  }, [isRehydrated, identityAuth, hubEmpresas, setTenantAuth])

  useEffect(() => {
    const pending = fallbackRef.current
    if (!pending) return
    fallbackRef.current = null

    void (async () => {
      try {
        const res = await fetch('/api/auth/escolher-empresa', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ empresaId: pending.empresaId }),
        })

        if (!res.ok) throw new Error('escolher-empresa failed')

        const data = (await res.json()) as { accessToken?: string }
        if (!data.accessToken) throw new Error('no accessToken')

        bootstrapTabSessionManually(data.accessToken, pending.empParam)

        const prev = useAuthStore.getState().getUser()
        const auth = buildAuthFromAccessToken(
          data.accessToken,
          prev ? { id: prev.getId(), email: prev.getEmail(), name: prev.getName() } : undefined
        )
        setTenantAuth(auth)
      } catch {
        try {
          const current = sessionStorage.getItem(SESSION_STORAGE_SESSION_NONCE)
          if (current === pending.tempNonce) {
            sessionStorage.removeItem(SESSION_STORAGE_SESSION_NONCE)
            sessionStorage.removeItem(SESSION_STORAGE_EMPRESA_SLUG)
          }
        } catch { /* ignore */ }
        window.location.href = '/meus-apps'
      }
    })()
  }, [identityAuth, setTenantAuth])

  return null
}
