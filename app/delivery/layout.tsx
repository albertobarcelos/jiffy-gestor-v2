import type { ReactNode } from 'react'
import type { Viewport } from 'next'
import '@/src/presentation/components/features/delivery-publico/shared/theme/delivery-publico-theme.css'
import { DeliveryPublicoShell } from '@/src/presentation/components/features/delivery-publico/public/components/DeliveryPublicoShell'

/**
 * No Chrome Android, `interactiveWidget: 'resizes-content'` faz a viewport
 * encolher com o teclado. No iOS o shell ainda depende de visualViewport (JS).
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
}

/**
 * Layout isolado do delivery público (`/delivery/*`).
 * Não inclui TopNav administrativo.
 */
export default function DeliveryLayout({
  children,
}: {
  children: ReactNode
}) {
  return <DeliveryPublicoShell>{children}</DeliveryPublicoShell>
}
