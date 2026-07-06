'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type {
  NovoPedidoCatalogoSlice,
  NovoPedidoEdicaoLinhaSlice,
  NovoPedidoEntregaSlice,
  NovoPedidoFormattersSlice,
  NovoPedidoFormSlice,
  NovoPedidoPagamentoSlice,
} from './novoPedidoContextTypes'

export type NovoPedidoFormContextValue = NovoPedidoFormSlice &
  NovoPedidoCatalogoSlice &
  NovoPedidoEdicaoLinhaSlice &
  NovoPedidoPagamentoSlice &
  NovoPedidoEntregaSlice &
  NovoPedidoFormattersSlice

const NovoPedidoFormContext = createContext<NovoPedidoFormContextValue | null>(null)

interface NovoPedidoFormProviderProps {
  value: NovoPedidoFormContextValue
  children: ReactNode
}

export function NovoPedidoFormProvider({ value, children }: NovoPedidoFormProviderProps) {
  return (
    <NovoPedidoFormContext.Provider value={value}>{children}</NovoPedidoFormContext.Provider>
  )
}

export function useNovoPedidoFormContext(): NovoPedidoFormContextValue {
  const context = useContext(NovoPedidoFormContext)
  if (!context) {
    throw new Error('useNovoPedidoFormContext deve ser usado dentro de NovoPedidoFormProvider')
  }
  return context
}
