'use client'

import { useEffect } from 'react'
import {
  EXPEDICAO_APP_CHROME_CLASS_MARCA,
  corChromeExpedicaoApp,
  type ChromeExpedicaoApp,
} from '@/src/presentation/expedicao/app/pwa/viewportExpedicaoApp'

export function useChromeExpedicaoApp(chrome: ChromeExpedicaoApp) {
  useEffect(() => {
    const html = document.documentElement
    const cor = corChromeExpedicaoApp(chrome)
    html.classList.toggle(EXPEDICAO_APP_CHROME_CLASS_MARCA, chrome === 'marca')
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', cor)
    return () => {
      html.classList.remove(EXPEDICAO_APP_CHROME_CLASS_MARCA)
    }
  }, [chrome])
}
