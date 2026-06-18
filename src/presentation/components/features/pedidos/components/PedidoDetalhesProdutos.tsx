'use client'

import type { HTMLAttributes, ReactNode } from 'react'

interface PedidoDetalhesProdutosProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function PedidoDetalhesProdutos({
  children,
  className = '',
  ...props
}: PedidoDetalhesProdutosProps) {
  return (
    <div className={`overflow-hidden rounded-lg border bg-gray-50 ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}
