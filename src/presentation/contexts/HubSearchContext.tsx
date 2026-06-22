'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type HubSearchConfig = {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

type HubSearchContextValue = {
  search: HubSearchConfig | null
  registerSearch: (config: HubSearchConfig) => void
  clearSearch: () => void
}

const HubSearchContext = createContext<HubSearchContextValue | null>(null)

export function HubSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState<HubSearchConfig | null>(null)

  const registerSearch = useCallback((config: HubSearchConfig) => {
    setSearch(config)
  }, [])

  const clearSearch = useCallback(() => {
    setSearch(null)
  }, [])

  const value = useMemo(
    () => ({ search, registerSearch, clearSearch }),
    [search, registerSearch, clearSearch]
  )

  return <HubSearchContext.Provider value={value}>{children}</HubSearchContext.Provider>
}

function useHubSearchContext() {
  const ctx = useContext(HubSearchContext)
  if (!ctx) {
    throw new Error('useRegisterHubSearch deve ser usado dentro de HubSearchProvider')
  }
  return ctx
}

/** Regista a busca da página atual na barra superior do hub (limpa ao desmontar). */
export function useRegisterHubSearch({
  value,
  onChange,
  placeholder = 'Buscar',
  enabled = true,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  enabled?: boolean
}) {
  const { registerSearch, clearSearch } = useHubSearchContext()

  useEffect(() => {
    if (!enabled) {
      clearSearch()
      return
    }
    registerSearch({ value, onChange, placeholder })
  }, [enabled, value, onChange, placeholder, registerSearch, clearSearch])

  useEffect(() => {
    return () => clearSearch()
  }, [clearSearch])
}

export function useHubSearchSlot() {
  const ctx = useContext(HubSearchContext)
  return ctx?.search ?? null
}
