'use client'

import { useState, useEffect } from 'react'

/**
 * Retorna `true` enquanto a largura da janela for menor que `breakpoint` (padrão: 768px).
 * Usa `window.innerWidth < breakpoint` como limiar.
 */
export function useIsMobile(breakpoint = 768): boolean {
  // Sempre inicia como `false` para coincidir com o SSR (sem window).
  // O useEffect corrige para o valor real após hidratação.
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < breakpoint)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [breakpoint])

  return isMobile
}
