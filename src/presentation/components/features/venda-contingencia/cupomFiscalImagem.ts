'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export const CupomFiscalImagemContext = createContext<string | null>(null)

export function useCupomFiscalImagemUrl(): string | null {
  return useContext(CupomFiscalImagemContext)
}

export type StatusImagemDanfe = 'idle' | 'loading' | 'ready' | 'error'

const PRELOAD_TIMEOUT_MS = 8_000

/**
 * Pré-carrega o PNG DANFE/NFC-e 80mm no cache do navegador.
 * Sem `src`, fica idle (cupom sem fiscal).
 */
export function useCarregarImagemDanfe80(src: string | null | undefined): {
  status: StatusImagemDanfe
  displayUrl: string | null
} {
  const [status, setStatus] = useState<StatusImagemDanfe>(src ? 'loading' : 'idle')

  useEffect(() => {
    if (!src) {
      setStatus('idle')
      return
    }

    let cancelled = false
    setStatus('loading')

    const img = new Image()
    const timer = window.setTimeout(() => {
      if (!cancelled) setStatus('error')
    }, PRELOAD_TIMEOUT_MS)

    img.onload = () => {
      window.clearTimeout(timer)
      if (!cancelled) setStatus('ready')
    }
    img.onerror = () => {
      window.clearTimeout(timer)
      if (!cancelled) setStatus('error')
    }
    img.src = src

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      img.onload = null
      img.onerror = null
    }
  }, [src])

  return { status, displayUrl: status === 'ready' && src ? src : null }
}
