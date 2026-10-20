'use client'

import { useEffect } from 'react'

/** Registra o SW mínimo do cardápio (instalabilidade PWA). */
export function DeliveryPwaServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV === 'development') {
      // Em localhost o SW ainda ajuda a testar install em Chrome; mantém registro.
    }

    let cancelled = false
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      if (!cancelled) {
        // Sem SW o banner Android pode não aparecer — falha silenciosa.
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
