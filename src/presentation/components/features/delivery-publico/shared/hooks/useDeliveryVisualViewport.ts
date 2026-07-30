'use client'

import { useEffect } from 'react'

const VV_HEIGHT = '--delivery-vv-height'
const VV_WIDTH = '--delivery-vv-width'
const VV_OFFSET_TOP = '--delivery-vv-offset-top'
const VV_OFFSET_LEFT = '--delivery-vv-offset-left'
/** Só trata como teclado quando a visualViewport encolhe de forma clara. */
const KEYBOARD_THRESHOLD_PX = 120

function resetDocumentScroll() {
  window.scrollTo(0, 0)
  document.documentElement.scrollLeft = 0
  document.body.scrollLeft = 0
}

/**
 * Sincroniza a visualViewport em CSS vars para o teclado mobile.
 *
 * Importante: NÃO escuta `visualViewport.scroll` no uso normal — no iOS isso
 * redimensiona o shell a cada frame e a barra sticky “pula”.
 * Com teclado aberto, alinha também width/offsetLeft para não “estourar”
 * a largura quando o Safari iOS faz zoom no input.
 */
export function useDeliveryVisualViewport() {
  useEffect(() => {
    const root = document.documentElement

    const sync = () => {
      const vv = window.visualViewport
      const layoutHeight = window.innerHeight
      const layoutWidth = window.innerWidth
      const vvHeight = vv?.height ?? layoutHeight
      const vvWidth = vv?.width ?? layoutWidth
      const keyboardOpen = layoutHeight - vvHeight > KEYBOARD_THRESHOLD_PX

      if (keyboardOpen) {
        root.style.setProperty(VV_HEIGHT, `${Math.round(vvHeight)}px`)
        root.style.setProperty(VV_WIDTH, `${Math.round(vvWidth)}px`)
        root.style.setProperty(VV_OFFSET_TOP, `${Math.round(vv?.offsetTop ?? 0)}px`)
        root.style.setProperty(VV_OFFSET_LEFT, `${Math.round(vv?.offsetLeft ?? 0)}px`)
        return
      }

      // Shell estável com teclado fechado (sem saltos ao rolar).
      root.style.setProperty(VV_HEIGHT, `${layoutHeight}px`)
      root.style.setProperty(VV_WIDTH, `${layoutWidth}px`)
      root.style.setProperty(VV_OFFSET_TOP, '0px')
      root.style.setProperty(VV_OFFSET_LEFT, '0px')
      resetDocumentScroll()
    }

    sync()

    const vv = window.visualViewport
    vv?.addEventListener('resize', sync)
    window.addEventListener('resize', sync)

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      const tag = target.tagName
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return

      window.setTimeout(() => {
        sync()
        // Só vertical — `inline` no iOS pode empurrar o layout para o lado.
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 150)
    }

    const onFocusOut = () => {
      window.setTimeout(() => {
        sync()
        resetDocumentScroll()
      }, 150)
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)

    return () => {
      vv?.removeEventListener('resize', sync)
      window.removeEventListener('resize', sync)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      root.style.removeProperty(VV_HEIGHT)
      root.style.removeProperty(VV_WIDTH)
      root.style.removeProperty(VV_OFFSET_TOP)
      root.style.removeProperty(VV_OFFSET_LEFT)
    }
  }, [])
}
