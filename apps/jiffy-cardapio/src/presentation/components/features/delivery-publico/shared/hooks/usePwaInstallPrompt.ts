'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  dismissPwaInstall,
  PWA_INSTALL_DISMISS_CURTO_MS,
  PWA_INSTALL_DISMISS_LONGO_MS,
  pwaInstallEstaDismissed,
  registrarVisitaPwaSlug,
} from '../utils/pwaInstallStorage'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia?.('(display-mode: standalone)')?.matches
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  )
  return Boolean(mq || iosStandalone)
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches
}

export type UsePwaInstallPromptOptions = {
  slug: string
  /**
   * `home`: só após 2ª visita + delay.
   * `sucesso`: elegível assim que possível (respeita dismiss / standalone).
   */
  contexto: 'home' | 'sucesso'
  /** Delay antes de exibir (home). Default 2500. */
  delayMs?: number
  /** Se false, não mostra (ex.: modal aberto). Default true. */
  permitido?: boolean
}

export function usePwaInstallPrompt({
  slug,
  contexto,
  delayMs = 2500,
  permitido = true,
}: UsePwaInstallPromptOptions) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visivel, setVisivel] = useState(false)
  const [guiaIosAberto, setGuiaIosAberto] = useState(false)
  const [guiaAndroidAberto, setGuiaAndroidAberto] = useState(false)
  const [plataforma, setPlataforma] = useState<'android' | 'ios' | 'outro'>('outro')

  useEffect(() => {
    if (!slug.trim()) return
    if (contexto === 'home') {
      registrarVisitaPwaSlug(slug)
    }
  }, [slug, contexto])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (isIosDevice()) setPlataforma('ios')
    else if (isAndroidDevice()) setPlataforma('android')
    else setPlataforma('outro')

    const onBip = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  useEffect(() => {
    if (!permitido) {
      setVisivel(false)
      return
    }
    if (!slug.trim()) return
    if (isStandaloneDisplay()) return
    if (!isMobileViewport()) return
    if (pwaInstallEstaDismissed(slug)) return

    const visitas = (() => {
      try {
        return Number(
          window.localStorage.getItem(
            `jiffy-cardapio:pwa-visits:${slug.trim().toLowerCase()}`
          ) || '0'
        )
      } catch {
        return 0
      }
    })()

    const elegivelHome = contexto === 'sucesso' || visitas >= 2
    if (!elegivelHome) return

    // Sem beforeinstallprompt (HTTP/IP, iOS, etc.) ainda mostramos CTA + guia manual.
    if (!isIosDevice() && !isAndroidDevice()) return

    const wait = contexto === 'sucesso' ? 400 : delayMs
    const t = window.setTimeout(() => setVisivel(true), wait)
    return () => window.clearTimeout(t)
  }, [slug, contexto, delayMs, permitido, deferredPrompt])

  const fechar = useCallback(
    (modo: 'curto' | 'longo') => {
      dismissPwaInstall(
        slug,
        modo === 'longo' ? PWA_INSTALL_DISMISS_LONGO_MS : PWA_INSTALL_DISMISS_CURTO_MS
      )
      setVisivel(false)
      setGuiaIosAberto(false)
      setGuiaAndroidAberto(false)
    },
    [slug]
  )

  const instalar = useCallback(async () => {
    if (plataforma === 'ios') {
      setGuiaIosAberto(true)
      return
    }
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        await deferredPrompt.userChoice
      } catch {
        // ignore
      } finally {
        setDeferredPrompt(null)
        setVisivel(false)
        dismissPwaInstall(slug, PWA_INSTALL_DISMISS_LONGO_MS)
      }
      return
    }
    // Android sem evento nativo (comum em HTTP/LAN): guia manual.
    setGuiaAndroidAberto(true)
  }, [deferredPrompt, plataforma, slug])

  return {
    visivel,
    plataforma,
    guiaIosAberto,
    guiaAndroidAberto,
    fecharGuiaIos: () => setGuiaIosAberto(false),
    fecharGuiaAndroid: () => setGuiaAndroidAberto(false),
    instalar,
    agoraNao: () => fechar('curto'),
    naoMostrarDeNovo: () => fechar('longo'),
  }
}
