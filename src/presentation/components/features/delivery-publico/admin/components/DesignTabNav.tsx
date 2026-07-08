'use client'

import { cn } from '@/src/shared/utils/cn'
import type { DesignTabId } from '../../shared/types/deliveryPublicoDesignConfig'
import { DESIGN_TABS } from '../../shared/constants/designTabs'

type DesignTabNavProps = {
  activeTab: DesignTabId
  onTabChange: (tab: DesignTabId) => void
}

export function DesignTabNav({ activeTab, onTabChange }: DesignTabNavProps) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-px scrollbar-hide"
      aria-label="Abas de personalização do design"
    >
      {DESIGN_TABS.map(tab => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'shrink-0 whitespace-nowrap border-b-2 px-3 py-1.5 text-sm font-semibold transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary-text hover:border-gray-300 hover:text-primary-text'
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
