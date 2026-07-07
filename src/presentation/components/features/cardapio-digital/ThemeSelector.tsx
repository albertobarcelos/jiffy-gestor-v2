'use client'

import { useCardapioTheme, type CardapioTheme } from '@/src/presentation/hooks/useCardapioTheme'
import { MdLightMode } from 'react-icons/md'

interface ThemeOption {
  id: CardapioTheme
  label: string
  iconColor: string
  description: string
}

const themeOptions: ThemeOption[] = [
  {
    id: 'dark',
    label: 'Tema roxo',
    iconColor: '#530CA3',
    description: 'Tema roxo',
  },
  {
    id: 'normal',
    label: 'Tema azul',
    iconColor: '#003366',
    description: 'Tema azul',
  },
]

interface ThemeSelectorProps {
  /** Ícones apenas — ideal para barra superior no mobile */
  compact?: boolean
}

function ThemeIconButton({
  option,
  isActive,
  onSelect,
  compact,
}: {
  option: ThemeOption
  isActive: boolean
  onSelect: () => void
  compact: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative rounded-md flex items-center justify-center transition-colors ${
        compact
          ? 'p-1.5 min-h-[36px] min-w-[36px]'
          : 'p-2 min-h-[36px] min-w-[36px]'
      }`}
      style={{
        backgroundColor: isActive
          ? 'var(--cardapio-menu-item-active)'
          : compact
            ? 'transparent'
            : 'var(--cardapio-menu-item)',
        color: option.iconColor,
        boxShadow: !compact && isActive ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
      }}
      title={option.description}
      aria-label={option.label}
      aria-pressed={isActive}
    >
      <MdLightMode className="w-4 h-4 flex-shrink-0" />
    </button>
  )
}

function TemasLabel({ compact }: { compact?: boolean }) {
  return (
    <span
      className="text-[12px] font-medium whitespace-nowrap"
      style={{
        color: compact
          ? 'var(--cardapio-text-secondary)'
          : 'var(--cardapio-elevated-text-secondary)',
      }}
    >
      Temas:
    </span>
  )
}

/**
 * Seletor de tema — ícones roxo e azul (MdLightMode).
 */
export default function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const { theme, setTheme } = useCardapioTheme()

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-shrink-0">
        <TemasLabel compact />
        {themeOptions.map(option => (
          <ThemeIconButton
            key={option.id}
            option={option}
            isActive={theme === option.id}
            onSelect={() => setTheme(option.id)}
            compact
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-1 p-1 sm:p-1.5 backdrop-blur-sm rounded-lg border w-fit"
      style={{
        backgroundColor: 'var(--cardapio-bg-elevated)',
        borderColor: 'var(--cardapio-border)',
      }}
    >
      <TemasLabel />
      {themeOptions.map(option => (
        <ThemeIconButton
          key={option.id}
          option={option}
          isActive={theme === option.id}
          onSelect={() => setTheme(option.id)}
          compact={false}
        />
      ))}
    </div>
  )
}
