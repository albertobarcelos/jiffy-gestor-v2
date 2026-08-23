'use client'

import { useEffect, useState } from 'react'

/** Relógio compartilhado para badges de tempo (Expedição / Lista). */
export function useAgoraKanban(intervaloMs = 30_000): number {
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), intervaloMs)
    return () => window.clearInterval(id)
  }, [intervaloMs])

  return agora
}
