'use client'

import { MdClose, MdHome } from 'react-icons/md'
import { cn } from '@/src/shared/utils/cn'
import {
  getDesignSectionById,
  type DesignSectionId,
} from '../../shared/constants/designTabs'

export type DesignWorkspaceTabId = 'home' | DesignSectionId

type DesignOpenTabsBarProps = {
  openTabs: DesignSectionId[]
  activeTab: DesignWorkspaceTabId
  onSelectTab: (tab: DesignWorkspaceTabId) => void
  onCloseTab: (tab: DesignSectionId) => void
}

export function DesignOpenTabsBar({
  openTabs,
  activeTab,
  onSelectTab,
  onCloseTab,
}: DesignOpenTabsBarProps) {
  const homeActive = activeTab === 'home'

  return (
    <nav
      className="flex gap-1 overflow-x-auto pb-px scrollbar-hide"
      aria-label="Abas do design"
    >
      <button
        type="button"
        onClick={() => onSelectTab('home')}
        aria-current={homeActive ? 'page' : undefined}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-1.5 text-sm font-semibold transition-colors',
          homeActive
            ? 'border-primary text-primary'
            : 'border-transparent text-secondary-text hover:border-gray-300 hover:text-primary-text'
        )}
      >
        <MdHome className="h-4 w-4" aria-hidden />
        Início
      </button>

      {openTabs.map(tabId => {
        const tab = getDesignSectionById(tabId)
        if (!tab) return null
        const isActive = tabId === activeTab
        return (
          <div
            key={tabId}
            className={cn(
              'group flex shrink-0 items-center gap-1 border-b-2 px-2 py-1.5 text-sm font-semibold transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary-text hover:border-gray-300 hover:text-primary-text'
            )}
          >
            <button
              type="button"
              onClick={() => onSelectTab(tabId)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap px-1"
              aria-current={isActive ? 'page' : undefined}
            >
              <tab.Icon className="h-4 w-4 shrink-0" aria-hidden />
              {tab.label}
            </button>
            <button
              type="button"
              onClick={event => {
                event.stopPropagation()
                onCloseTab(tabId)
              }}
              className={cn(
                'rounded p-0.5 transition-colors hover:bg-gray-100',
                isActive ? 'text-primary' : 'text-secondary-text'
              )}
              aria-label={`Fechar ${tab.label}`}
              title="Fechar aba"
            >
              <MdClose className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )
      })}
    </nav>
  )
}
