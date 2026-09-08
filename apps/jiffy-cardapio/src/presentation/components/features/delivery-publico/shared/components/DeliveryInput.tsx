'use client'

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const fieldClass = 'w-full rounded-lg border px-3 py-2 text-sm'

const defaultFieldStyle = {
  borderColor: 'var(--delivery-border)',
  backgroundColor: 'var(--delivery-surface)',
  color: 'var(--delivery-text)',
} as const

const checkoutFieldStyle = {
  borderColor: 'color-mix(in srgb, var(--delivery-primary) 22%, transparent)',
  backgroundColor: '#ffffff',
  color: 'var(--delivery-primary)',
} as const

type FieldVariant = 'default' | 'checkout'

type DeliveryInputProps = InputHTMLAttributes<HTMLInputElement> & {
  variant?: FieldVariant
}

type DeliveryTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  variant?: FieldVariant
}

type DeliverySelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  variant?: FieldVariant
}

function resolveFieldClass(variant: FieldVariant) {
  return variant === 'checkout'
    ? `${fieldClass} delivery-checkout-field`.trim()
    : fieldClass
}

function resolveFieldStyle(variant: FieldVariant) {
  return variant === 'checkout' ? checkoutFieldStyle : defaultFieldStyle
}

export function DeliveryInput({ className = '', variant = 'default', ...props }: DeliveryInputProps) {
  return (
    <input
      className={`${resolveFieldClass(variant)} ${className}`.trim()}
      style={resolveFieldStyle(variant)}
      {...props}
    />
  )
}

export function DeliveryTextarea({
  className = '',
  variant = 'default',
  ...props
}: DeliveryTextareaProps) {
  return (
    <textarea
      className={`${resolveFieldClass(variant)} ${className}`.trim()}
      style={resolveFieldStyle(variant)}
      {...props}
    />
  )
}

export function DeliverySelect({
  className = '',
  variant = 'default',
  children,
  ...props
}: DeliverySelectProps) {
  return (
    <select
      className={`${resolveFieldClass(variant)} ${className}`.trim()}
      style={resolveFieldStyle(variant)}
      {...props}
    >
      {children}
    </select>
  )
}
