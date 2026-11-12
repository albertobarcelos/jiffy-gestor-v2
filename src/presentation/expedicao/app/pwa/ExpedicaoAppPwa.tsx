'use client'

import { useEffect } from 'react'
import { isSuperficieExpedicaoApp } from '@/src/application/expedicao/app/detectarSuperficieExpedicao'
import {
  deveCorrigirPanVisualViewportExpedicaoApp,
  deveImpedirGestoPinchExpedicaoApp,
} from '@/src/application/expedicao/app/travaViewportExpedicaoApp'
import { useExpedicaoAppVisualViewport } from '@/src/presentation/expedicao/app/pwa/useExpedicaoAppVisualViewport'
import {
  deveImpedirOverscrollNoDocumento,
  EXPEDICAO_APP_CHROME_MARCA,
  EXPEDICAO_APP_VIEWPORT_CLASS,
} from '@/src/presentation/expedicao/app/pwa/viewportExpedicaoApp'

const MANIFEST_HREF = '/expedicao-app/manifest.webmanifest'
const SW_HREF = '/sw-expedicao-app.js'
const GESTOS_PINCH = ['gesturestart', 'gesturechange', 'gestureend'] as const

function travaDocumentoExpedicaoApp() {
  const html = document.documentElement
  const body = document.body
  html.classList.add(EXPEDICAO_APP_VIEWPORT_CLASS)
  body.classList.add(EXPEDICAO_APP_VIEWPORT_CLASS)

  let ultimoY: number | null = null

  const onTouchStart = (event: TouchEvent) => {
    if (deveImpedirGestoPinchExpedicaoApp(event.touches.length)) {
      if (event.cancelable) event.preventDefault()
      ultimoY = null
      return
    }
    ultimoY = event.touches[0]?.clientY ?? null
  }
  const onTouchMove = (event: TouchEvent) => {
    if (!event.cancelable) return
    if (deveImpedirGestoPinchExpedicaoApp(event.touches.length)) {
      event.preventDefault()
      return
    }
    const y = event.touches[0]?.clientY
    const deltaY = ultimoY != null && y != null ? y - ultimoY : 0
    if (y != null) ultimoY = y
    if (deveImpedirOverscrollNoDocumento(event.target, deltaY)) {
      event.preventDefault()
    }
  }
  const onTouchEnd = () => {
    ultimoY = null
  }
  const onGestoPinch = (event: Event) => {
    event.preventDefault()
  }
  const corrigirViewport = () => {
    const vv = window.visualViewport
    if (
      deveCorrigirPanVisualViewportExpedicaoApp({
        scale: vv?.scale ?? 1,
        offsetLeft: vv?.offsetLeft ?? 0,
        windowScrollX: window.scrollX,
        windowScrollY: window.scrollY,
      })
    ) {
      window.scrollTo(0, 0)
    }
  }

  document.addEventListener('touchstart', onTouchStart, { passive: false })
  document.addEventListener('touchmove', onTouchMove, { passive: false })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
  document.addEventListener('touchcancel', onTouchEnd, { passive: true })
  window.addEventListener('scroll', corrigirViewport, { passive: true })
  window.visualViewport?.addEventListener('scroll', corrigirViewport)
  window.visualViewport?.addEventListener('resize', corrigirViewport)
  GESTOS_PINCH.forEach(tipo => {
    document.addEventListener(tipo, onGestoPinch, { passive: false })
  })

  return () => {
    html.classList.remove(EXPEDICAO_APP_VIEWPORT_CLASS)
    body.classList.remove(EXPEDICAO_APP_VIEWPORT_CLASS)
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
    document.removeEventListener('touchcancel', onTouchEnd)
    window.removeEventListener('scroll', corrigirViewport)
    window.visualViewport?.removeEventListener('scroll', corrigirViewport)
    window.visualViewport?.removeEventListener('resize', corrigirViewport)
    GESTOS_PINCH.forEach(tipo => {
      document.removeEventListener(tipo, onGestoPinch)
    })
  }
}

export function ExpedicaoAppPwa() {
  useExpedicaoAppVisualViewport()
  useEffect(() => {
    const app = isSuperficieExpedicaoApp({
      pathname: window.location.pathname,
      search: window.location.search,
      host: window.location.host,
    })
    if (!app) return

    const soltarDocumento = travaDocumentoExpedicaoApp()

    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = MANIFEST_HREF
    document.head.appendChild(link)

    const apple = document.createElement('link')
    apple.rel = 'apple-touch-icon'
    apple.href = '/images/expedicao/logo_app.png'
    document.head.appendChild(apple)

    const metas = [
      ['theme-color', EXPEDICAO_APP_CHROME_MARCA],
      ['apple-mobile-web-app-capable', 'yes'],
      ['apple-mobile-web-app-status-bar-style', 'black-translucent'],
      ['apple-mobile-web-app-title', 'JiffyGO'],
      ['mobile-web-app-capable', 'yes'],
    ].map(([name, content]) => {
      const meta = document.createElement('meta')
      meta.name = name
      meta.content = content
      document.head.appendChild(meta)
      return meta
    })

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register(SW_HREF).catch(() => undefined)
    }

    return () => {
      soltarDocumento()
      link.remove()
      apple.remove()
      metas.forEach(meta => meta.remove())
    }
  }, [])

  return null
}
