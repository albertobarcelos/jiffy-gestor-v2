'use client'

import type { ReactNode } from 'react'

type DeliveryCardProps = {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md'
}

export function DeliveryCard({ children, className = '', padding = 'md' }: DeliveryCardProps) {
  const paddingClass = padding === 'sm' ? 'p-2' : 'p-3'
  return (
    <div
      className={`rounded-lg border ${paddingClass} ${className}`.trim()}
      style={{
        borderColor: 'var(--delivery-card-border)',
        backgroundColor: 'var(--delivery-surface)',
      }}
    >
      {children}
    </div>
  )
}
