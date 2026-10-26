'use client'

import { useEffect } from 'react'
import { isSuperficieExpedicaoApp } from '@/src/application/expedicao/app/detectarSuperficieExpedicao'
import {
  deveImpedirOverscrollDocumentoExpedicaoApp,
  EXPEDICAO_APP_VIEWPORT_CLASS,
} from '@/src/application/expedicao/app/travaViewportExpedicaoApp'

const MANIFEST_HREF = '/expedicao-app/manifest.webmanifest'
const SW_HREF = '/sw-expedicao-app.js'

function travaDocumentoExpedicaoApp() {
  const html = document.documentElement
  const body = document.body
  html.classList.add(EXPEDICAO_APP_VIEWPORT_CLASS)
  body.classList.add(EXPEDICAO_APP_VIEWPORT_CLASS)

  let ultimoY: number | null = null

  const onTouchStart = (event: TouchEvent) => {
    ultimoY = event.touches[0]?.clientY ?? null
  }
  const onTouchMove = (event: TouchEvent) => {
    if (!event.cancelable) return
    const y = event.touches[0]?.clientY
    const deltaY = ultimoY != null && y != null ? y - ultimoY : 0
    if (y != null) ultimoY = y
    if (deveImpedirOverscrollDocumentoExpedicaoApp({ target: event.target, deltaY })) {
      event.preventDefault()
    }
  }
  const onTouchEnd = () => {
    ultimoY = null
  }
  const onScrollJanela = () => {
    if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0)
  }

  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: false })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
  document.addEventListener('touchcancel', onTouchEnd, { passive: true })
  window.addEventListener('scroll', onScrollJanela, { passive: true })

  return () => {
    html.classList.remove(EXPEDICAO_APP_VIEWPORT_CLASS)
    body.classList.remove(EXPEDICAO_APP_VIEWPORT_CLASS)
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
    document.removeEventListener('touchcancel', onTouchEnd)
    window.removeEventListener('scroll', onScrollJanela)
  }
}

export function ExpedicaoAppPwa() {
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
      ['theme-color', '#5b21b6'],
      ['apple-mobile-web-app-capable', 'yes'],
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
