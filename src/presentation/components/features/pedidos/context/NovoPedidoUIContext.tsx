'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { NovoPedidoUISlice } from './novoPedidoContextTypes'

const NovoPedidoUIContext = createContext<NovoPedidoUISlice | null>(null)

interface NovoPedidoUIProviderProps {
  value: NovoPedidoUISlice
  children: ReactNode
}

export function NovoPedidoUIProvider({ value, children }: NovoPedidoUIProviderProps) {
  return <NovoPedidoUIContext.Provider value={value}>{children}</NovoPedidoUIContext.Provider>
}

export function useNovoPedidoUIContext(): NovoPedidoUISlice {
  const context = useContext(NovoPedidoUIContext)
  if (!context) {
    throw new Error('useNovoPedidoUIContext deve ser usado dentro de NovoPedidoUIProvider')
  }
  return context
}
