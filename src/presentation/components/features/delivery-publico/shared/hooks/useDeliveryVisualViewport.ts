'use client'

import { useEffect } from 'react'

const VV_HEIGHT = '--delivery-vv-height'
const VV_OFFSET_TOP = '--delivery-vv-offset-top'
const KEYBOARD_OPEN_CLASS = 'delivery-keyboard-open'
/** Diferença mínima entre layout e visualViewport para considerar teclado aberto. */
const KEYBOARD_THRESHOLD_PX = 120

/**
 * Sincroniza a visualViewport (altura útil com teclado aberto) em CSS vars.
 * Necessário no iOS/Safari quando o shell do delivery é `position: fixed`.
 * Também marca `delivery-keyboard-open` no `html` para a UI reagir (ex.: ocultar topnav).
 */
export function useDeliveryVisualViewport() {
  useEffect(() => {
    const root = document.documentElement

    const sync = () => {
      const vv = window.visualViewport
      const height = vv?.height ?? window.innerHeight
      const offsetTop = vv?.offsetTop ?? 0
      root.style.setProperty(VV_HEIGHT, `${height}px`)
      root.style.setProperty(VV_OFFSET_TOP, `${offsetTop}px`)

      const keyboardOpen = window.innerHeight - height > KEYBOARD_THRESHOLD_PX
      root.classList.toggle(KEYBOARD_OPEN_CLASS, keyboardOpen)
    }

    sync()

    const vv = window.visualViewport
    vv?.addEventListener('resize', sync)
    vv?.addEventListener('scroll', sync)
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
      vv?.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      root.style.removeProperty(VV_HEIGHT)
      root.style.removeProperty(VV_OFFSET_TOP)
      root.classList.remove(KEYBOARD_OPEN_CLASS)
    }
  }, [])
}
