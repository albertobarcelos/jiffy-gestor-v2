import type { ReactNode } from 'react'
import type { Viewport } from 'next'
import '@/src/presentation/components/features/delivery-publico/shared/theme/delivery-publico-theme.css'
import { DeliveryPublicoShell } from '@/src/presentation/components/features/delivery-publico/public/components/DeliveryPublicoShell'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
}

export const metadata = {
  title: 'Jiffy Cardápio',
  description: 'Faça seu pedido online',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <DeliveryPublicoShell>{children}</DeliveryPublicoShell>
      </body>
    </html>
  )
}
