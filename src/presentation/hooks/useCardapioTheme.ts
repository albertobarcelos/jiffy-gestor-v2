'use client'

import { useState, useEffect } from 'react'

export type CardapioTheme = 'dark' | 'normal'

const THEME_STORAGE_KEY = 'cardapio_theme'
const DEFAULT_THEME: CardapioTheme = 'dark'
const VALID_THEMES: CardapioTheme[] = ['dark', 'normal']

/** Migra ids legados salvos antes da simplificação de temas. */
function normalizeStoredTheme(raw: string | null): CardapioTheme | null {
  if (!raw) return null
  if (raw === 'clean') return 'normal'
  if (raw === 'colors') return 'dark'
  if (VALID_THEMES.includes(raw as CardapioTheme)) return raw as CardapioTheme
  return null
}

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

    const savedTheme = normalizeStoredTheme(sessionStorage.getItem(THEME_STORAGE_KEY))

    if (savedTheme) {
      setThemeState(savedTheme)
      applyTheme(savedTheme)
      sessionStorage.setItem(THEME_STORAGE_KEY, savedTheme)
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
    if (!VALID_THEMES.includes(newTheme)) {
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
    themes: VALID_THEMES,
  }
}
