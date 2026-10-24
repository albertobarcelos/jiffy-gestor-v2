'use client'

import { useEffect } from 'react'
import { isSuperficieExpedicaoApp } from '@/src/application/expedicao/app/detectarSuperficieExpedicao'

const MANIFEST_HREF = '/expedicao-app/manifest.webmanifest'
const SW_HREF = '/sw-expedicao-app.js'

export function ExpedicaoAppPwa() {
  useEffect(() => {
    const app = isSuperficieExpedicaoApp({
      pathname: window.location.pathname,
      search: window.location.search,
      host: window.location.host,
    })
    if (!app) return

    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = MANIFEST_HREF
    document.head.appendChild(link)

    const apple = document.createElement('link')
    apple.rel = 'apple-touch-icon'
    apple.href = '/images/jiffy-favicon.png'
    document.head.appendChild(apple)

    const metas = [
      ['theme-color', '#5b21b6'],
      ['apple-mobile-web-app-capable', 'yes'],
      ['apple-mobile-web-app-title', 'Entregador'],
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
      link.remove()
      apple.remove()
      metas.forEach(meta => meta.remove())
    }
  }, [])

  return null
}
