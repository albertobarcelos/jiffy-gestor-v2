'use client'

import { cn } from '@/src/shared/utils/cn'

export type PizzaSetupTabId = 'detalhes' | 'tamanhos' | 'massas' | 'bordas'

const TABS: Array<{ id: PizzaSetupTabId; label: string }> = [
  { id: 'detalhes', label: 'Detalhes' },
  { id: 'tamanhos', label: 'Tamanhos' },
  { id: 'massas', label: 'Massas' },
  { id: 'bordas', label: 'Bordas' },
]

interface PizzaSetupTabsProps {
  active: PizzaSetupTabId
  onChange: (tab: PizzaSetupTabId) => void
  className?: string
}

export function PizzaSetupTabs({ active, onChange, className }: PizzaSetupTabsProps) {
  return (
    <nav
      className={cn('flex gap-6 border-b border-gray-200 px-4 md:px-6', className)}
      aria-label="Configuração da categoria pizza"
    >
      {TABS.map(tab => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              '-mb-px border-b-2 pb-3 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary-text hover:text-primary-text'
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}

export const PIZZA_SETUP_TAB_ORDER: PizzaSetupTabId[] = ['detalhes', 'tamanhos', 'massas', 'bordas']

export function nextPizzaSetupTab(current: PizzaSetupTabId): PizzaSetupTabId | null {
  const idx = PIZZA_SETUP_TAB_ORDER.indexOf(current)
  if (idx < 0 || idx >= PIZZA_SETUP_TAB_ORDER.length - 1) return null
  return PIZZA_SETUP_TAB_ORDER[idx + 1]!
}

export function prevPizzaSetupTab(current: PizzaSetupTabId): PizzaSetupTabId | null {
  const idx = PIZZA_SETUP_TAB_ORDER.indexOf(current)
  if (idx <= 0) return null
  return PIZZA_SETUP_TAB_ORDER[idx - 1]!
}
