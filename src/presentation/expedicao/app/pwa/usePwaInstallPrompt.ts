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

export type PwaInstallPrompt = {
  /** false no SSR e no 1º paint — só true depois do mount (evita hydration mismatch). */
  pronto: boolean
  standalone: boolean
  ehCelular: boolean
  acabouDeInstalar: boolean
  instalado: boolean
  podeInstalar: boolean
  instalar: () => Promise<void>
}

export function usePwaInstallPrompt(): PwaInstallPrompt {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(false)
  const [ehCelular, setEhCelular] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [acabouDeInstalar, setAcabouDeInstalar] = useState(false)

  useEffect(() => {
    const jaStandalone = lerStandalone()
    setStandalone(jaStandalone)
    setEhCelular(ehCelularPwaEntregador(navigator.userAgent))
    setPronto(true)
    if (jaStandalone) return

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
    pronto,
    standalone,
    ehCelular,
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
