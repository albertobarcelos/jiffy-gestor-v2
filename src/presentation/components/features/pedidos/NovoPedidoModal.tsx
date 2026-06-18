'use client'

import { NovoPedidoProvider } from './context/NovoPedidoContext'
import { useNovoPedidoOrchestrator } from './hooks/useNovoPedidoOrchestrator'
import { NovoPedidoModalShell } from './components/shell/NovoPedidoModalShell'
import type { NovoPedidoModalProps } from './types'

export function NovoPedidoModal(props: NovoPedidoModalProps) {
  const { contextValue, shell } = useNovoPedidoOrchestrator(props)

  return (
    <NovoPedidoProvider value={contextValue}>
      <NovoPedidoModalShell {...shell} />
    </NovoPedidoProvider>
  )
}
