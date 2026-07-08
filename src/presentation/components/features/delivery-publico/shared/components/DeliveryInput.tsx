'use client'

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const fieldClass = 'w-full rounded-lg border px-3 py-2 text-sm'

const fieldStyle = {
  borderColor: 'var(--delivery-border)',
  backgroundColor: 'var(--delivery-surface)',
  color: 'var(--delivery-text)',
}

export function DeliveryInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`.trim()} style={fieldStyle} {...props} />
}

export function DeliveryTextarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldClass} ${className}`.trim()} style={fieldStyle} {...props} />
}

export function DeliverySelect({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${fieldClass} ${className}`.trim()} style={fieldStyle} {...props}>
      {children}
    </select>
  )
}
