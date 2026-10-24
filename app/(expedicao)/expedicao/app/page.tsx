import type { Metadata, Viewport } from 'next'
import { ExpedicaoAppMotoboy } from '@/src/presentation/expedicao/app/ExpedicaoAppMotoboy'

export const viewport: Viewport = {
  themeColor: '#5b21b6',
}

export const metadata: Metadata = {
  title: 'JiffyGO',
  description: 'Pedidos, rota e comissão do entregador Jiffy.',
  manifest: '/expedicao-app/manifest.webmanifest',
  icons: {
    icon: '/images/expedicao/logo_app.png',
    apple: '/images/expedicao/logo_app.png',
  },
  appleWebApp: {
    capable: true,
    title: 'JiffyGO',
    statusBarStyle: 'default',
  },
}

export default function ExpedicaoAppPage() {
  return <ExpedicaoAppMotoboy />
}
