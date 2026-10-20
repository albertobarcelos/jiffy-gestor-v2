'use client'

import type { ReactNode } from 'react'

interface PedidoPagamentoStepProps {
  children: ReactNode
}

export function PedidoPagamentoStep({ children }: PedidoPagamentoStepProps) {
  return <div className="space-y-4">{children}</div>
}
