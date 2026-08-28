'use client'

import { cn } from '@/src/shared/utils/cn'
import type { PizzaSetupTabId } from './PizzaSetupTabs'

export type PizzaCategoriaEditTabId = PizzaSetupTabId | 'cardapios'

const TABS: Array<{ id: PizzaCategoriaEditTabId; label: string }> = [
  { id: 'detalhes', label: 'Detalhes' },
  { id: 'tamanhos', label: 'Tamanhos' },
  { id: 'massas', label: 'Massas' },
  { id: 'bordas', label: 'Bordas' },
  { id: 'cardapios', label: 'Cardápios' },
]

interface PizzaCategoriaEditTabsProps {
  active: PizzaCategoriaEditTabId
  onChange: (tab: PizzaCategoriaEditTabId) => void
  className?: string
}

export function PizzaCategoriaEditTabs({ active, onChange, className }: PizzaCategoriaEditTabsProps) {
  return (
    <nav
      className={cn('flex gap-6 overflow-x-auto border-b border-gray-200 px-4 md:px-6', className)}
      aria-label="Edição da categoria pizza"
    >
      {TABS.map(tab => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              '-mb-px shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors',
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
