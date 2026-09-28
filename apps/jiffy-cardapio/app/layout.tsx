import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import '@/src/presentation/components/features/delivery-publico/shared/theme/delivery-publico-theme.css'
import { DeliveryPublicoShell } from '@/src/presentation/components/features/delivery-publico/public/components/DeliveryPublicoShell'
import { QueryProvider } from '@/src/presentation/providers/QueryProvider'
import { cardapioPublicBaseUrl } from '@/src/infrastructure/seo/cardapioPublicBaseUrl'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  /**
   * Sem `interactiveWidget`: o shell já sincroniza `visualViewport`.
   * Os dois juntos redimensionam o layout duas vezes no Safari iOS.
   */
}

export const metadata: Metadata = {
  metadataBase: new URL(cardapioPublicBaseUrl()),
  title: {
    default: 'Cardápio digital',
    template: '%s',
  },
  description: 'Peça online no cardápio da loja.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      {/* ColorZilla e similares injetam cz-shortcut-listen no body antes do React hidratar. */}
      <body suppressHydrationWarning>
        <QueryProvider>
          <DeliveryPublicoShell>{children}</DeliveryPublicoShell>
        </QueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
