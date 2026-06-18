'use client'

import { useMemo, type ReactNode } from 'react'
import type { NovoPedidoContextValue } from './novoPedidoContextTypes'
import { NovoPedidoFormProvider } from './NovoPedidoFormContext'
import { NovoPedidoUIProvider } from './NovoPedidoUIContext'
import { NovoPedidoDetalheProvider } from './NovoPedidoDetalheContext'
import {
  splitDetalheContextValue,
  splitFormContextValue,
  splitUIContextValue,
} from './splitNovoPedidoContext'

export type { NovoPedidoContextValue } from './novoPedidoContextTypes'
export { useNovoPedidoFormContext } from './NovoPedidoFormContext'
export { useNovoPedidoUIContext } from './NovoPedidoUIContext'
export { useNovoPedidoDetalheContext } from './NovoPedidoDetalheContext'

interface NovoPedidoProviderProps {
  value: NovoPedidoContextValue
  children: ReactNode
}

export function NovoPedidoProvider({ value, children }: NovoPedidoProviderProps) {
  const formValue = useMemo(() => splitFormContextValue(value), [value])
  const uiValue = useMemo(() => splitUIContextValue(value), [value])
  const detalheValue = useMemo(() => splitDetalheContextValue(value), [value])

  return (
    <NovoPedidoFormProvider value={formValue}>
      <NovoPedidoUIProvider value={uiValue}>
        <NovoPedidoDetalheProvider value={detalheValue}>{children}</NovoPedidoDetalheProvider>
      </NovoPedidoUIProvider>
    </NovoPedidoFormProvider>
  )
}
