'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Toaster } from 'react-hot-toast'
import { useDeliveryVisualViewport } from '../../shared/hooks/useDeliveryVisualViewport'

const IOS_LOCK_CLASS = 'delivery-publico-ios-lock'

/** Acima dos overlays de checkout (form z-100, mapa z-120, pin z-130). */
const TOAST_Z_INDEX = 200

/**
 * Shell de viewport fixo + scroll interno.
 * Evita rubber-band do Safari iOS e redimensiona com o teclado (visualViewport).
 */
export function DeliveryPublicoShell({ children }: { children: ReactNode }) {
  useDeliveryVisualViewport()
  const [toastHost, setToastHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setToastHost(document.body)
  }, [])

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
      {toastHost
        ? createPortal(
            <Toaster
              position="top-center"
              containerStyle={{ zIndex: TOAST_Z_INDEX }}
            />,
            toastHost
          )
        : null}
    </div>
  )
}
