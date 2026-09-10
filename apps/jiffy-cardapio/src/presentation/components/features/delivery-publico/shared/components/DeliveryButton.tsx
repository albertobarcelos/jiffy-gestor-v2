'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

type DeliveryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  fullWidth?: boolean
}

export function DeliveryButton({
  children,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: DeliveryButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`rounded-xl py-3 font-semibold transition-opacity disabled:opacity-60 ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
      style={{
        backgroundColor: 'var(--delivery-primary)',
        color: 'var(--delivery-btn-text)',
      }}
      {...props}
    >
      {children}
    </button>
  )
}
