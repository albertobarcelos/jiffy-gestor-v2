'use client'

import type { ReactNode } from 'react'
import { deveMostrarPortaoInstalacaoPwa } from '@/src/application/expedicao/app/portaoInstalacaoPwaEntregador'
import { ExpedicaoAppInstalarScreen } from '@/src/presentation/expedicao/app/pwa/ExpedicaoAppInstalarScreen'
import { ExpedicaoAppPwa } from '@/src/presentation/expedicao/app/pwa/ExpedicaoAppPwa'
import { usePwaInstallPrompt } from '@/src/presentation/expedicao/app/pwa/usePwaInstallPrompt'

export function ExpedicaoAppPwaPortao({ children }: { children: ReactNode }) {
  const pwa = usePwaInstallPrompt()
  const portao = deveMostrarPortaoInstalacaoPwa({
    ehCelular: pwa.ehCelular,
    standalone: pwa.standalone,
  })

  return (
    <>
      <ExpedicaoAppPwa />
      {portao ? <ExpedicaoAppInstalarScreen /> : children}
    </>
  )
}
