'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { NovoPedidoDetalheSlice } from './novoPedidoContextTypes'

const NovoPedidoDetalheContext = createContext<NovoPedidoDetalheSlice | null>(null)

interface NovoPedidoDetalheProviderProps {
  value: NovoPedidoDetalheSlice
  children: ReactNode
}

export function NovoPedidoDetalheProvider({ value, children }: NovoPedidoDetalheProviderProps) {
  return (
    <NovoPedidoDetalheContext.Provider value={value}>{children}</NovoPedidoDetalheContext.Provider>
  )
}

export function useNovoPedidoDetalheContext(): NovoPedidoDetalheSlice {
  const context = useContext(NovoPedidoDetalheContext)
  if (!context) {
    throw new Error('useNovoPedidoDetalheContext deve ser usado dentro de NovoPedidoDetalheProvider')
  }
  return context
}
