'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwaInstallPrompt() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null)
  const [instalado, setInstalado] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) {
      setInstalado(true)
      return
    }

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setEvento(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalado(true)
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
    instalado,
    podeInstalar: Boolean(evento),
    instalar: async () => {
      if (!evento) return
      await evento.prompt()
      const escolha = await evento.userChoice
      if (escolha.outcome === 'accepted') setInstalado(true)
      setEvento(null)
    },
  }
}
