'use client'

import { useEffect } from 'react'

const VV_HEIGHT = '--delivery-vv-height'
const VV_OFFSET_TOP = '--delivery-vv-offset-top'
/** Só trata como teclado quando a visualViewport encolhe de forma clara. */
const KEYBOARD_THRESHOLD_PX = 120

/**
 * Sincroniza a visualViewport em CSS vars para o teclado mobile.
 *
 * Importante: NÃO escuta `visualViewport.scroll` nem aplica offsetTop
 * durante o scroll normal — no iOS isso redimensiona o shell a cada frame
 * e a barra sticky (busca/grupos) “pula”.
 */
export function useDeliveryVisualViewport() {
  useEffect(() => {
    const root = document.documentElement

    const sync = () => {
      const vv = window.visualViewport
      const layoutHeight = window.innerHeight
      const vvHeight = vv?.height ?? layoutHeight
      const keyboardOpen = layoutHeight - vvHeight > KEYBOARD_THRESHOLD_PX

      if (keyboardOpen) {
        root.style.setProperty(VV_HEIGHT, `${Math.round(vvHeight)}px`)
        root.style.setProperty(
          VV_OFFSET_TOP,
          `${Math.round(vv?.offsetTop ?? 0)}px`
        )
        return
      }

      // Shell estável com teclado fechado (sem saltos ao rolar).
      root.style.setProperty(VV_HEIGHT, `${layoutHeight}px`)
      root.style.setProperty(VV_OFFSET_TOP, '0px')
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
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
      }, 150)
    }

    const onFocusOut = () => {
      window.setTimeout(sync, 150)
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)

    return () => {
      vv?.removeEventListener('resize', sync)
      window.removeEventListener('resize', sync)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      root.style.removeProperty(VV_HEIGHT)
      root.style.removeProperty(VV_OFFSET_TOP)
    }
  }, [])
}
