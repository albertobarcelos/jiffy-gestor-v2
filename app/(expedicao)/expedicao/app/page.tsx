import type { Metadata, Viewport } from 'next'
import { ExpedicaoAppMotoboy } from '@/src/presentation/expedicao/app/ExpedicaoAppMotoboy'

export const viewport: Viewport = {
  themeColor: '#5b21b6',
}

export const metadata: Metadata = {
  title: 'Jiffy Entregador',
  description: 'Pedidos, rota e comissão do entregador Jiffy.',
  manifest: '/expedicao-app/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Entregador',
    statusBarStyle: 'default',
  },
}

export default function ExpedicaoAppPage() {
  return <ExpedicaoAppMotoboy />
}
