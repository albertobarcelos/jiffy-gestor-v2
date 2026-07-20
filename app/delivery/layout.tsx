'use client'

import { ReactNode } from 'react'
import '@/src/presentation/components/features/delivery-publico/shared/theme/delivery-publico-theme.css'

/**
 * Layout isolado do delivery público (`/delivery/*`).
 * Não inclui TopNav administrativo.
 */
export default function DeliveryLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--delivery-bg, var(--delivery-surface, #f5f5f5))',
      }}
    >
      <main className="w-full">{children}</main>
    </div>
  )
}
