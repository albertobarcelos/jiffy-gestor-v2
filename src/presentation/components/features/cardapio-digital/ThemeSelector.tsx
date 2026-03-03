'use client'

import { useCardapioTheme, type CardapioTheme } from '@/src/presentation/hooks/useCardapioTheme'
import { MdDarkMode, MdLightMode, MdPalette } from 'react-icons/md'

interface ThemeOption {
  id: CardapioTheme
  label: string
  icon: typeof MdDarkMode
  description: string
  previewColors: {
    primary: string
    secondary: string
    accent: string
  }
}

const themeOptions: ThemeOption[] = [
  {
    id: 'dark',
    label: 'Escuro',
    icon: MdDarkMode,
    description: 'Elegante e sofisticado',
    previewColors: {
      primary: '#000000',
      secondary: '#1A1A1A',
      accent: '#DC2626',
    },
  },
  {
    id: 'clean',
    label: 'Limpo',
    icon: MdLightMode,
    description: 'Minimalista e claro',
    previewColors: {
      primary: '#FFFFFF',
      secondary: '#F8F9FA',
      accent: '#0D6EFD',
    },
  },
  {
    id: 'colors',
    label: 'Colorido',
    icon: MdPalette,
    description: 'Vibrante e alegre',
    previewColors: {
      primary: '#F0F4F8',
      secondary: '#FFFFFF',
      accent: '#FF6B6B',
    },
  },
]

/**
 * Seletor de tema para o cardápio digital
 * Permite escolher entre Dark, Clean e Colors
 */
export default function ThemeSelector() {
  const { theme, setTheme } = useCardapioTheme()

  return (
    <div
      className="flex items-center gap-2 p-2 backdrop-blur-sm rounded-lg border"
      style={{
        backgroundColor: 'var(--cardapio-bg-elevated)',
        borderColor: 'var(--cardapio-border)',
      }}
    >
      <span
        className="text-xs font-medium px-2"
        style={{ color: 'var(--cardapio-text-secondary)' }}
      >
        Tema:
      </span>
      <div className="flex gap-1">
        {themeOptions.map((option) => {
          const Icon = option.icon
          const isActive = theme === option.id

          return (
            <button
              key={option.id}
              onClick={() => setTheme(option.id)}
              className="relative px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
              style={{
                backgroundColor: isActive
                  ? 'var(--cardapio-menu-item-active)'
                  : 'var(--cardapio-menu-item)',
                color: isActive
                  ? 'var(--cardapio-text-primary)'
                  : 'var(--cardapio-text-secondary)',
                boxShadow: isActive ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-menu-item-hover)'
                  e.currentTarget.style.color = 'var(--cardapio-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-menu-item)'
                  e.currentTarget.style.color = 'var(--cardapio-text-secondary)'
                }
              }}
              title={option.description}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium hidden sm:inline">{option.label}</span>

              {/* Indicador visual de cores */}
              <div className="flex gap-0.5 ml-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: option.previewColors.primary }}
                />
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: option.previewColors.accent }}
                />
              </div>

              {/* Indicador de ativo */}
              {isActive && (
                <div
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--cardapio-accent-primary)' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
