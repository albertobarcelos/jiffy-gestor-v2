'use client'

import { cn } from '@/src/shared/utils/cn'

type DesignPremiumBadgeProps = {
  className?: string
  label?: string
}

export function DesignPremiumBadge({ className, label = 'Mais+' }: DesignPremiumBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white',
        className
      )}
    >
      {label}
    </span>
  )
}
