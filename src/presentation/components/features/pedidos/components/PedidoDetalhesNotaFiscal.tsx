'use client'

import type { HTMLAttributes, ReactNode } from 'react'

interface PedidoDetalhesNotaFiscalProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function PedidoDetalhesNotaFiscal({
  children,
  className = '',
  ...props
}: PedidoDetalhesNotaFiscalProps) {
  return (
    <div className={`space-y-3 ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}
