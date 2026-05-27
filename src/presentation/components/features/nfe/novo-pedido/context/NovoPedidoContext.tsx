'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type NovoPedidoContextValue = Record<string, any>

const NovoPedidoContext = createContext<NovoPedidoContextValue | null>(null)

interface NovoPedidoProviderProps {
  value: NovoPedidoContextValue
  children: ReactNode
}

export function NovoPedidoProvider({ value, children }: NovoPedidoProviderProps) {
  return <NovoPedidoContext.Provider value={value}>{children}</NovoPedidoContext.Provider>
}

export function useNovoPedidoContext(): NovoPedidoContextValue {
  const context = useContext(NovoPedidoContext)
  if (!context) {
    throw new Error('useNovoPedidoContext deve ser usado dentro de NovoPedidoProvider')
  }
  return context
}
