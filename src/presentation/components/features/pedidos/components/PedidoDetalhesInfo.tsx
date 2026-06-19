'use client'

import type { HTMLAttributes, ReactNode } from 'react'

interface PedidoDetalhesInfoProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function PedidoDetalhesInfo({ children, className = '', ...props }: PedidoDetalhesInfoProps) {
  return (
    <div className={`rounded-lg border bg-gray-50 px-4 ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}
