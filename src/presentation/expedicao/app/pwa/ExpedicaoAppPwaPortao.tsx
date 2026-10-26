'use client'

import type { ReactNode } from 'react'
import { deveMostrarPortaoInstalacaoPwa } from '@/src/application/expedicao/app/portaoInstalacaoPwaEntregador'
import { ExpedicaoAppInstalarScreen } from '@/src/presentation/expedicao/app/pwa/ExpedicaoAppInstalarScreen'
import { ExpedicaoAppPwa } from '@/src/presentation/expedicao/app/pwa/ExpedicaoAppPwa'
import { usePwaInstallPrompt } from '@/src/presentation/expedicao/app/pwa/usePwaInstallPrompt'

export function ExpedicaoAppPwaPortao({ children }: { children: ReactNode }) {
  const pwa = usePwaInstallPrompt()

  // SSR + 1º paint iguais: sem ler navigator no render (hydration).
  if (!pwa.pronto) {
    return (
      <>
        <ExpedicaoAppPwa />
        <div className="expedicao-app-shell h-dvh bg-secondary" aria-busy="true" aria-label="Carregando" />
      </>
    )
  }

  const portao = deveMostrarPortaoInstalacaoPwa({
    ehCelular: pwa.ehCelular,
    standalone: pwa.standalone,
  })

  return (
    <>
      <ExpedicaoAppPwa />
      {portao ? <ExpedicaoAppInstalarScreen pwa={pwa} /> : children}
    </>
  )
}
