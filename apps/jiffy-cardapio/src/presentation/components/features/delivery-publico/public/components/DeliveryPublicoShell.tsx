'use client'

import { type ReactNode, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useDeliveryVisualViewport } from '../../shared/hooks/useDeliveryVisualViewport'

const IOS_LOCK_CLASS = 'delivery-publico-ios-lock'

/**
 * Shell de viewport fixo + scroll interno.
 * Evita rubber-band do Safari iOS e redimensiona com o teclado (visualViewport).
 */
export function DeliveryPublicoShell({ children }: { children: ReactNode }) {
  useDeliveryVisualViewport()

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.classList.add(IOS_LOCK_CLASS)
    body.classList.add(IOS_LOCK_CLASS)

    return () => {
      html.classList.remove(IOS_LOCK_CLASS)
      body.classList.remove(IOS_LOCK_CLASS)
    }
  }, [])

  return (
    <div className="delivery-publico-shell">
      <main className="delivery-publico-scroll w-full">{children}</main>
      <Toaster position="top-center" />
    </div>
  )
}
