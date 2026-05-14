'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'

const AUTH_STORAGE_KEY = 'auth-storage'

/**
 * Quando outra aba altera o `localStorage` do Zustand persist (ex.: logout do hub),
 * reidrata **identityAuth** aqui.
 *
 * `tenantAuth` NÃO é persistido no localStorage (isolamento per-tab), então a
 * reidratação nunca sobrescreve o tenant da aba corrente.
 */
export function AuthStorageCrossTabSync() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUTH_STORAGE_KEY || e.storageArea !== localStorage) {
        return
      }

      const currentTenant = useAuthStore.getState().tenantAuth

      if (e.newValue === null) {
        useAuthStore.setState({
          identityAuth: null,
          tenantAuth: currentTenant,
          auth: currentTenant ?? null,
          hubEmpresas: null,
          isAuthenticated: !!currentTenant,
          error: null,
        })
        return
      }

      void Promise.resolve(useAuthStore.persist.rehydrate())
        .then(() => {
          useAuthStore.setState(s => ({
            tenantAuth: currentTenant,
            auth: currentTenant ?? s.identityAuth ?? null,
            isAuthenticated: !!(currentTenant || s.identityAuth),
          }))
        })
        .catch(() => {
          /* noop */
        })
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return null
}
