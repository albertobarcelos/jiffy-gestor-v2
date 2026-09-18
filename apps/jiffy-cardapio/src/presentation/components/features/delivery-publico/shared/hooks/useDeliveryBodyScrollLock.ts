'use client'

import { useEffect } from 'react'

/** Scroll real do cardápio. O `body` já fica travado pelo shell iOS. */
export const DELIVERY_PUBLICO_SCROLL_SELECTOR = '.delivery-publico-scroll'
const SCROLLPORT_LOCKED_CLASS = 'delivery-publico-scroll--locked'

export type DeliveryScrollportSnapshot = {
  el: HTMLElement
  scrollTop: number
}

let lockCount = 0
let previousBodyOverflow = ''
let previousHtmlOverflow = ''
let scrollportSnapshots: DeliveryScrollportSnapshot[] = []

/**
 * Tira o scrollport do fluxo de gesto e guarda a posição.
 * O Safari iOS pode zerar `scrollTop` ao mudar overflow — por isso reaplicamos na hora.
 */
export function lockDeliveryScrollport(el: HTMLElement): DeliveryScrollportSnapshot {
  const snapshot: DeliveryScrollportSnapshot = {
    el,
    scrollTop: el.scrollTop,
  }
  el.classList.add(SCROLLPORT_LOCKED_CLASS)
  el.scrollTop = snapshot.scrollTop
  return snapshot
}

export function unlockDeliveryScrollport(snapshot: DeliveryScrollportSnapshot): void {
  snapshot.el.classList.remove(SCROLLPORT_LOCKED_CLASS)
  snapshot.el.scrollTop = snapshot.scrollTop
}

function lockScrollports() {
  const nodes = document.querySelectorAll<HTMLElement>(DELIVERY_PUBLICO_SCROLL_SELECTOR)
  scrollportSnapshots = Array.from(nodes).map(lockDeliveryScrollport)
}

function unlockScrollports() {
  for (const snapshot of scrollportSnapshots) {
    unlockDeliveryScrollport(snapshot)
  }
  scrollportSnapshots = []
}

function acquireBodyScrollLock() {
  if (typeof document === 'undefined') return

  if (lockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    lockScrollports()
  }

  lockCount += 1
}

function releaseBodyScrollLock() {
  if (typeof document === 'undefined') return

  lockCount = Math.max(0, lockCount - 1)

  if (lockCount === 0) {
    unlockScrollports()
    document.body.style.overflow = previousBodyOverflow
    document.documentElement.style.overflow = previousHtmlOverflow
  }
}

/**
 * Trava o scroll do documento e de `.delivery-publico-scroll` enquanto overlays
 * do delivery público estão abertos. Usa ref-count para empilhamento de modais.
 */
export function useDeliveryBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return

    acquireBodyScrollLock()
    return () => releaseBodyScrollLock()
  }, [active])
}
