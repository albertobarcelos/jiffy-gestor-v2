'use client'

import type { ReactNode } from 'react'
import { cn } from '@/src/shared/utils/cn'
import { DesignPremiumBadge } from './DesignPremiumBadge'

type DesignSelectableCardProps = {
  selected: boolean
  disabled?: boolean
  premium?: boolean
  onClick: () => void
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

export function DesignSelectableCard({
  selected,
  disabled = false,
  premium = false,
  onClick,
  title,
  description,
  children,
  className,
}: DesignSelectableCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative flex flex-col rounded-xl border-2 bg-white p-4 text-left transition-colors',
        selected ? 'border-secondary shadow-sm' : 'border-gray-200 hover:border-gray-300',
        disabled && 'cursor-not-allowed opacity-70',
        className
      )}
    >
      {premium ? (
        <DesignPremiumBadge className="absolute right-3 top-3" />
      ) : null}
      {children}
      <span className="mt-2 text-sm font-semibold text-primary-text">{title}</span>
      {description ? <span className="mt-0.5 text-xs text-secondary-text">{description}</span> : null}
    </button>
  )
}
