'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'

const AUTH_STORAGE_KEY = 'auth-storage'

/**
 * Quando outra aba altera o `localStorage` do Zustand persist (ex.: logout do hub em convites),
 * reidrata o store aqui para que identidade/tenant fiquem alinhados em todas as guias.
 */
export function AuthStorageCrossTabSync() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUTH_STORAGE_KEY || e.storageArea !== localStorage) {
        return
      }

      if (e.newValue === null) {
        useAuthStore.setState({
          identityAuth: null,
          tenantAuth: null,
          auth: null,
          hubEmpresas: null,
          isAuthenticated: false,
          error: null,
        })
        return
      }

      void Promise.resolve(useAuthStore.persist.rehydrate()).catch(() => {
        /* noop — estado já pode estar consistente */
      })
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return null
}
