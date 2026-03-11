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
    label: 'Dark Food',
    icon: MdDarkMode,
    description: 'Tema escuro moderno para cardápio',
    previewColors: {
      primary: '#121212',
      secondary: '#1E1E1E',
      accent: '#FF7A00',
    },
  },
  {
    id: 'clean',
    label: 'Premium',
    icon: MdLightMode,
    description: 'Tema limpo e premium',
    previewColors: {
      primary: '#F8F9FA',
      secondary: '#FFFFFF',
      accent: '#D62828',
    },
  },
  {
    id: 'colors',
    label: 'Gourmet',
    icon: MdPalette,
    description: 'Tema escuro gourmet',
    previewColors: {
      primary: '#121212',
      secondary: '#1E1E1E',
      accent: '#E63946',
    },
  },
]

/**
 * Seletor de tema para o cardápio digital
 * Permite escolher entre Dark Food, Premium e Gourmet
 */
export default function ThemeSelector() {
  const { theme, setTheme } = useCardapioTheme()

  return (
    <div
      className="items-center justify-center lg:justify-start gap-1.5 p-1.5 backdrop-blur-sm rounded-lg border md:flex hidden"
      style={{
        backgroundColor: 'var(--cardapio-bg-elevated)',
        borderColor: 'var(--cardapio-border)',
      }}
    >
      <span
        className="text-[10px] font-medium px-1.5 whitespace-nowrap hidden lg:block"
        style={{ color: 'var(--cardapio-text-secondary)' }}
      >
        Tema:
      </span>
      <div className="flex gap-0.5">
        {themeOptions.map((option) => {
          const Icon = option.icon
          const isActive = theme === option.id

          return (
            <button
              key={option.id}
              onClick={() => setTheme(option.id)}
              className="relative px-1 lg:px-2 py-1 lg:py-2 rounded-md transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
              style={{
                backgroundColor: isActive
                  ? 'var(--cardapio-menu-item-active)'
                  : 'var(--cardapio-menu-item)',
                color: isActive
                  ? 'var(--cardapio-text-primary)'
                  : 'var(--cardapio-text-secondary)',
                boxShadow: isActive ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
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
              <Icon className="w-3 h-3 flex-shrink-0" />
              <span className="text-[10px] font-medium">{option.label}</span>

              {/* Indicador visual de cores */}
              <div className="gap-0.5 ml-0.5 hidden lg:flex">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: option.previewColors.primary }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: option.previewColors.accent }}
                />
              </div>

              {/* Indicador de ativo */}
              {isActive && (
                <div
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
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
