'use client'

import type { ReactNode } from 'react'

interface PedidoPagamentoStepProps {
  children: ReactNode
}

export function PedidoPagamentoStep({ children }: PedidoPagamentoStepProps) {
  return <div className="space-y-2">{children}</div>
}
