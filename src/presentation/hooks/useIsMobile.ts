'use client'

import { useState, useEffect } from 'react'

/**
 * Retorna `true` enquanto a largura da janela for menor que `breakpoint` (padrão: 768px).
 * Usa `matchMedia` em vez de listener de `resize` para disparar apenas quando o breakpoint é cruzado.
 */
export function useIsMobile(breakpoint = 768): boolean {
  // Sempre inicia como `false` para coincidir com o SSR (sem window).
  // O useEffect corrige para o valor real após hidratação.
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}
