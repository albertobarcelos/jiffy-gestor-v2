'use client'

import type { ReactNode } from 'react'
import { MobilePreviewFrame } from '@/src/presentation/components/ui/MobilePreviewFrame'
import { ProdutoSimplePreviewCard } from './ProdutoSimplePreviewCard'
import type { ProdutoPreviewModel } from './produtoPreviewModel'
import type { ProdutoPreviewImageUpload } from './ProdutoSimplePreviewCard'
import { cn } from '@/src/shared/utils/cn'

interface ProdutoFormWithPreviewLayoutProps {
  children: ReactNode
  preview: ProdutoPreviewModel
  showPreview?: boolean
  previewTitle?: string
  className?: string
  imageUpload?: ProdutoPreviewImageUpload
}

/**
 * Formulário à esquerda + preview de celular fixo à direita (desktop).
 * O preview não remonta ao trocar steps internos — fica fora do conteúdo das etapas.
 */
export function ProdutoFormWithPreviewLayout({
  children,
  preview,
  showPreview = true,
  previewTitle = 'Preview',
  className,
  imageUpload,
}: ProdutoFormWithPreviewLayoutProps) {
  if (!showPreview) {
    return <div className={cn('min-h-0 flex-1', className)}>{children}</div>
  }

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col lg:min-h-[420px] lg:flex-row lg:gap-4',
        className
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      <aside className="hidden min-h-0 shrink-0 lg:flex lg:w-[min(100%,24rem)] lg:flex-col lg:pb-2 lg:pr-1">
        <MobilePreviewFrame title={previewTitle} className="min-h-[420px] flex-1">
          <ProdutoSimplePreviewCard {...preview} imageUpload={imageUpload} />
        </MobilePreviewFrame>
      </aside>
    </div>
  )
}
