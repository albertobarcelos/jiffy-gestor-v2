'use client'

import type { ReactNode } from 'react'

interface PedidoProdutosStepProps {
  children: ReactNode
}

export function PedidoProdutosStep({ children }: PedidoProdutosStepProps) {
  return <div className="flex min-h-0 flex-1 flex-col gap-2 py-2">{children}</div>
}
