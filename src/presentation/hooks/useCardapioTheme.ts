'use client'

import { useState, useEffect } from 'react'

export type CardapioTheme = 'dark' | 'clean' | 'colors'

const THEME_STORAGE_KEY = 'cardapio_theme'
const DEFAULT_THEME: CardapioTheme = 'dark'

/**
 * Hook para gerenciar o tema do cardápio digital
 * Persiste a preferência no sessionStorage
 */
export function useCardapioTheme() {
  const [theme, setThemeState] = useState<CardapioTheme>(DEFAULT_THEME)
  const [isInitialized, setIsInitialized] = useState(false)

  // Carregar tema salvo ao inicializar
  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedTheme = sessionStorage.getItem(THEME_STORAGE_KEY) as CardapioTheme | null

    if (savedTheme && ['dark', 'clean', 'colors'].includes(savedTheme)) {
      setThemeState(savedTheme)
      applyTheme(savedTheme)
    } else {
      applyTheme(DEFAULT_THEME)
    }

    setIsInitialized(true)
  }, [])

  // Aplicar tema no elemento raiz
  const applyTheme = (newTheme: CardapioTheme) => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    root.setAttribute('data-cardapio-theme', newTheme)
  }

  // Função para trocar tema
  const setTheme = (newTheme: CardapioTheme) => {
    if (!['dark', 'clean', 'colors'].includes(newTheme)) {
      console.warn(`Tema inválido: ${newTheme}. Usando tema padrão.`)
      newTheme = DEFAULT_THEME
    }

    setThemeState(newTheme)
    applyTheme(newTheme)

    // Salvar no sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(THEME_STORAGE_KEY, newTheme)
    }
  }

  return {
    theme,
    setTheme,
    isInitialized,
    themes: ['dark', 'clean', 'colors'] as const,
  }
}
