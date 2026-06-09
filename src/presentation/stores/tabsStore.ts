'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Tab {
  id: string
  label: string
  path: string
  isFixed?: boolean // Aba fixa (não pode ser fechada)
}

const LEGACY_PORTAL_TAB_ID = 'painel-contador'
const PORTAL_TAB_ID = 'portal-contador'
const LEGACY_IBPT_TAB_ID = 'etapa-5-chave-ibpt'
const CONFIG_FISCAIS_TAB_ID = 'etapa-1-dados-fiscais'

/** Migra abas legadas após renomear painel-contador → portal-contador. */
function migratePortalTabs(tabs: Tab[], activeTabId: string | null) {
  const hasLegacy = tabs.some((t) => t.id === LEGACY_PORTAL_TAB_ID)
  const hasCurrent = tabs.some((t) => t.id === PORTAL_TAB_ID)

  let nextTabs = tabs.map((tab) => ({
    ...tab,
    path: tab.path.replace('/painel-contador', '/portal-contador'),
  }))

  if (hasLegacy) {
    if (hasCurrent) {
      nextTabs = nextTabs.filter((t) => t.id !== LEGACY_PORTAL_TAB_ID)
    } else {
      nextTabs = nextTabs.map((tab) =>
        tab.id === LEGACY_PORTAL_TAB_ID
          ? { ...tab, id: PORTAL_TAB_ID, path: '/portal-contador' }
          : tab
      )
    }
  }

  let nextActive = activeTabId
  if (activeTabId === LEGACY_PORTAL_TAB_ID) {
    nextActive = PORTAL_TAB_ID
  }

  const hasLegacyIbpt = nextTabs.some((t) => t.id === LEGACY_IBPT_TAB_ID)
  const hasConfigFiscais = nextTabs.some((t) => t.id === CONFIG_FISCAIS_TAB_ID)

  if (hasLegacyIbpt) {
    if (hasConfigFiscais) {
      nextTabs = nextTabs.filter((t) => t.id !== LEGACY_IBPT_TAB_ID)
    } else {
      nextTabs = nextTabs.map((tab) =>
        tab.id === LEGACY_IBPT_TAB_ID
          ? { ...tab, id: CONFIG_FISCAIS_TAB_ID, label: 'Configurações Fiscais' }
          : tab
      )
    }
  }

  nextTabs = nextTabs.map((tab) =>
    tab.id === CONFIG_FISCAIS_TAB_ID && tab.label === 'Dados Fiscais e Certificado Digital'
      ? { ...tab, label: 'Configurações Fiscais' }
      : tab
  )

  if (nextActive === LEGACY_IBPT_TAB_ID) {
    nextActive = CONFIG_FISCAIS_TAB_ID
  }

  return { tabs: nextTabs, activeTabId: nextActive }
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
        const migrated = migratePortalTabs(get().tabs, get().activeTabId)
        if (migrated.tabs !== get().tabs || migrated.activeTabId !== get().activeTabId) {
          set(migrated)
        }

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
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<TabsState>
        const tabs = Array.isArray(stored.tabs) ? stored.tabs : current.tabs
        const activeTabId =
          typeof stored.activeTabId === 'string' || stored.activeTabId === null
            ? stored.activeTabId
            : current.activeTabId
        return { ...current, ...migratePortalTabs(tabs, activeTabId) }
      },
    }
  )
)

