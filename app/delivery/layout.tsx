'use client'

import { ReactNode, useEffect } from 'react'
import '@/src/presentation/components/features/delivery-publico/shared/theme/delivery-publico-theme.css'

const IOS_LOCK_CLASS = 'delivery-publico-ios-lock'

/**
 * Layout isolado do delivery público (`/delivery/*`).
 * Não inclui TopNav administrativo.
 *
 * Shell de viewport fixo + scroll interno para conter overscroll/rubber-band do Safari iOS.
 */
export default function DeliveryLayout({
  children,
}: {
  children: ReactNode
}) {
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
    </div>
  )
}
