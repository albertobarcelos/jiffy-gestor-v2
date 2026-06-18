'use client'

import type { ReactNode } from 'react'

interface PedidoInformacoesStepProps {
  children: ReactNode
}

export function PedidoInformacoesStep({ children }: PedidoInformacoesStepProps) {
  return <div className="space-y-3 py-2">{children}</div>
}
