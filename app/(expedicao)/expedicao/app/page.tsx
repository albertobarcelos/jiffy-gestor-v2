import type { Metadata, Viewport } from 'next'
import {
  EXPEDICAO_APP_CHROME_MARCA,
  VIEWPORT_ESCALA_APP_ENTREGADOR,
} from '@/src/presentation/expedicao/app/pwa/viewportExpedicaoApp'
import { ExpedicaoAppMotoboy } from '@/src/presentation/expedicao/app/ExpedicaoAppMotoboy'

export const viewport: Viewport = {
  themeColor: EXPEDICAO_APP_CHROME_MARCA,
  ...VIEWPORT_ESCALA_APP_ENTREGADOR,
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
    statusBarStyle: 'black-translucent',
  },
}

export default function ExpedicaoAppPage() {
  return <ExpedicaoAppMotoboy />
}
