'use client'

import { useCardapioTheme, type CardapioTheme } from '@/src/presentation/hooks/useCardapioTheme'
import { MdDarkMode, MdLightMode } from 'react-icons/md'

interface ThemeOption {
  id: CardapioTheme
  label: string
  icon: typeof MdDarkMode
  description: string
  previewColors: {
    primary: string
    accent: string
  }
}

const themeOptions: ThemeOption[] = [
  {
    id: 'dark',
    label: 'Dark',
    icon: MdDarkMode,
    description: 'Tema escuro',
    previewColors: { primary: '#121212', accent: '#FF7A00' },
  },
  {
    id: 'normal',
    label: 'Normal',
    icon: MdLightMode,
    description: 'Tema claro',
    previewColors: { primary: '#F8F9FA', accent: '#D62828' },
  },
]

interface ThemeSelectorProps {
  /** Ícones apenas — ideal para barra superior no mobile */
  compact?: boolean
}

/**
 * Seletor de tema — mobile-first: compacto no header, expandido no desktop.
 */
export default function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const { theme, setTheme } = useCardapioTheme()

  if (compact) {
    return (
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {themeOptions.map(option => {
          const Icon = option.icon
          const isActive = theme === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className="relative rounded-md p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
              style={{
                backgroundColor: isActive
                  ? 'var(--cardapio-menu-item-active)'
                  : 'transparent',
                color: isActive
                  ? 'var(--cardapio-text-primary)'
                  : 'var(--cardapio-text-secondary)',
              }}
              title={option.description}
              aria-label={`Tema ${option.label}`}
              aria-pressed={isActive}
            >
              <Icon className="w-4 h-4" />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className="flex items-center justify-center sm:justify-start gap-1 p-1 sm:p-1.5 backdrop-blur-sm rounded-lg border w-fit max-w-full"
      style={{
        backgroundColor: 'var(--cardapio-bg-elevated)',
        borderColor: 'var(--cardapio-border)',
      }}
    >
      <span
        className="text-[10px] font-medium px-1 whitespace-nowrap hidden sm:block"
        style={{ color: 'var(--cardapio-text-secondary)' }}
      >
        Tema:
      </span>
      <div className="flex gap-0.5">
        {themeOptions.map(option => {
          const Icon = option.icon
          const isActive = theme === option.id

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className="relative px-2 py-1.5 sm:px-2 sm:py-2 rounded-md transition-all duration-200 flex items-center gap-1 sm:gap-2 whitespace-nowrap min-h-[36px] min-w-[36px] sm:min-w-0"
              style={{
                backgroundColor: isActive
                  ? 'var(--cardapio-menu-item-active)'
                  : 'var(--cardapio-menu-item)',
                color: isActive
                  ? 'var(--cardapio-text-primary)'
                  : 'var(--cardapio-text-secondary)',
                boxShadow: isActive ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
              }}
              title={option.description}
              aria-label={`Tema ${option.label}`}
              aria-pressed={isActive}
            >
              <Icon className="w-4 h-4 sm:w-3 sm:h-3 flex-shrink-0" />
              <span className="text-[10px] sm:text-[10px] font-medium">{option.label}</span>

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
