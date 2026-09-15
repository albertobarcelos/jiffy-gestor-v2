'use client'

import type { ReactNode } from 'react'
import { cn } from '@/src/shared/utils/cn'
import './mobile-preview-frame.css'

interface MobilePreviewFrameProps {
  children: ReactNode
  title?: string
  className?: string
}

/** Moldura simples de celular para previews estáticos. */
export function MobilePreviewFrame({
  children,
  title = 'Preview',
  className,
}: MobilePreviewFrameProps) {
  return (
    <div className={cn('flex h-full min-h-0 w-full flex-col items-stretch', className)}>
      <p className="mb-2 shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-secondary-text">
        {title}
      </p>
      <div className="mobile-preview-shell relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border-8 border-gray-900 bg-gray-50 shadow-xl box-border">
        <div className="mobile-preview-viewport min-h-0 flex-1 overflow-y-auto scrollbar-hide">
          <div className="mobile-preview-scale-host">{children}</div>
        </div>
      </div>
    </div>
  )
}
