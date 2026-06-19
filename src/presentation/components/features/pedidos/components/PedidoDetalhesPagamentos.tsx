'use client'

import type { HTMLAttributes, ReactNode } from 'react'

interface PedidoDetalhesPagamentosProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function PedidoDetalhesPagamentos({
  children,
  className = '',
  ...props
}: PedidoDetalhesPagamentosProps) {
  return (
    <div className={`rounded-lg border bg-white px-4 ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}
