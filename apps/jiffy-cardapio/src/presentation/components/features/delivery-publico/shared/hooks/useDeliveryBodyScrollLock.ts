'use client'

import { useEffect } from 'react'

let lockCount = 0
let previousBodyOverflow = ''
let previousHtmlOverflow = ''

function acquireBodyScrollLock() {
  if (typeof document === 'undefined') return

  if (lockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
  }

  lockCount += 1
}

function releaseBodyScrollLock() {
  if (typeof document === 'undefined') return

  lockCount = Math.max(0, lockCount - 1)

  if (lockCount === 0) {
    document.body.style.overflow = previousBodyOverflow
    document.documentElement.style.overflow = previousHtmlOverflow
  }
}

/**
 * Trava o scroll do documento enquanto overlays do delivery público estão abertos.
 * Usa ref-count para empilhamento de modais.
 */
export function useDeliveryBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return

    acquireBodyScrollLock()
    return () => releaseBodyScrollLock()
  }, [active])
}
