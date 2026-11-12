'use client'

import { useEffect } from 'react'
import { isSuperficieExpedicaoApp } from '@/src/application/expedicao/app/detectarSuperficieExpedicao'
import { medidasTecladoVisualViewportExpedicaoApp } from '@/src/application/expedicao/app/travaViewportExpedicaoApp'
import {
  EXPEDICAO_APP_VV_HEIGHT,
  EXPEDICAO_APP_VV_OFFSET_TOP,
} from '@/src/presentation/expedicao/app/pwa/viewportExpedicaoApp'

function aplicarMedidas(root: HTMLElement) {
  const vv = window.visualViewport
  const medidas = medidasTecladoVisualViewportExpedicaoApp({
    innerHeight: window.innerHeight,
    vvHeight: vv?.height ?? window.innerHeight,
    vvOffsetTop: vv?.offsetTop ?? 0,
  })
  root.style.setProperty(EXPEDICAO_APP_VV_HEIGHT, `${medidas.heightPx}px`)
  root.style.setProperty(EXPEDICAO_APP_VV_OFFSET_TOP, `${medidas.offsetTopPx}px`)
  return medidas.tecladoAberto
}

function ehCampoEditavel(alvo: EventTarget | null): alvo is HTMLElement {
  if (!(alvo instanceof HTMLElement)) return false
  const tag = alvo.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function useExpedicaoAppVisualViewport() {
  useEffect(() => {
    const app = isSuperficieExpedicaoApp({
      pathname: window.location.pathname,
      search: window.location.search,
      host: window.location.host,
    })
    if (!app) return

    const root = document.documentElement

    const sync = () => {
      const tecladoAberto = aplicarMedidas(root)
      if (!tecladoAberto) window.scrollTo(0, 0)
    }

    sync()
    window.visualViewport?.addEventListener('resize', sync)
    window.addEventListener('resize', sync)

    const onFocusIn = (event: FocusEvent) => {
      if (!ehCampoEditavel(event.target)) return
      const campo = event.target
      window.setTimeout(() => {
        aplicarMedidas(root)
        campo.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 150)
    }
    const onFocusOut = () => {
      window.setTimeout(sync, 150)
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)

    return () => {
      window.visualViewport?.removeEventListener('resize', sync)
      window.removeEventListener('resize', sync)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      root.style.removeProperty(EXPEDICAO_APP_VV_HEIGHT)
      root.style.removeProperty(EXPEDICAO_APP_VV_OFFSET_TOP)
    }
  }, [])
}
