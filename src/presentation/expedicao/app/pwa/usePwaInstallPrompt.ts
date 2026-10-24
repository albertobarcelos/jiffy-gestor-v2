'use client'

import { useEffect, useState } from 'react'
import {
  ehCelularPwaEntregador,
  isDisplayStandalonePwa,
} from '@/src/application/expedicao/app/portaoInstalacaoPwaEntregador'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function lerStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return isDisplayStandalonePwa({
    displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches,
    iosStandalone: (navigator as Navigator & { standalone?: boolean }).standalone === true,
  })
}

export function usePwaInstallPrompt() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(lerStandalone)
  const [acabouDeInstalar, setAcabouDeInstalar] = useState(false)

  useEffect(() => {
    setStandalone(lerStandalone())
    if (lerStandalone()) return

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setEvento(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setAcabouDeInstalar(true)
      setEvento(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  return {
    standalone,
    ehCelular: typeof navigator === 'undefined' ? false : ehCelularPwaEntregador(navigator.userAgent),
    acabouDeInstalar,
    instalado: standalone || acabouDeInstalar,
    podeInstalar: Boolean(evento),
    instalar: async () => {
      if (!evento) return
      await evento.prompt()
      const escolha = await evento.userChoice
      if (escolha.outcome === 'accepted') setAcabouDeInstalar(true)
      setEvento(null)
    },
  }
}
