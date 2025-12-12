'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Tab {
  id: string
  label: string
  path: string
  isFixed?: boolean // Aba fixa (não pode ser fechada)
}

interface TabsState {
  tabs: Tab[]
  activeTabId: string | null
  addTab: (tab: Tab) => void
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  clearTabs: () => void
  getActiveTab: () => Tab | null
}

/**
 * Store para gerenciar abas de navegação
 * Persiste no localStorage até logout ou fechamento manual
 */
export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (tab: Tab) => {
        const { tabs } = get()
        // Verifica se a aba já existe
        const existingTab = tabs.find((t) => t.id === tab.id)
        if (existingTab) {
          // Se existe, apenas ativa
          set({ activeTabId: tab.id })
          return
        }
        // Adiciona nova aba e ativa
        set({
          tabs: [...tabs, tab],
          activeTabId: tab.id,
        })
      },

      removeTab: (tabId: string) => {
        const { tabs, activeTabId } = get()
        const tabToRemove = tabs.find((t) => t.id === tabId)
        
        // Não permite fechar aba fixa
        if (tabToRemove?.isFixed) {
          return
        }

        const newTabs = tabs.filter((t) => t.id !== tabId)
        
        // Se a aba removida era a ativa, ativa a anterior ou a primeira
        let newActiveTabId: string | null = null
        if (activeTabId === tabId) {
          const currentIndex = tabs.findIndex((t) => t.id === tabId)
          if (currentIndex > 0) {
            // Ativa a aba anterior
            newActiveTabId = tabs[currentIndex - 1].id
          } else if (newTabs.length > 0) {
            // Ativa a primeira aba disponível
            newActiveTabId = newTabs[0].id
          }
        } else {
          newActiveTabId = activeTabId
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveTabId,
        })
      },

      setActiveTab: (tabId: string) => {
        set({ activeTabId: tabId })
      },

      clearTabs: () => {
        set({ tabs: [], activeTabId: null })
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get()
        return tabs.find((t) => t.id === activeTabId) || null
      },
    }),
    {
      name: 'tabs-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

