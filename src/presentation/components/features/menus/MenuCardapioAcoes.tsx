'use client'

import { cn } from '@/src/shared/utils/cn'
import Link from 'next/link'

interface MenuCardapioAcoesProps {
  onAdicionar: () => void
  onReordenar?: () => void
  loteHref?: string
  adicionarLabel?: string
  className?: string
}

export function MenuCardapioAcoes({
  onAdicionar,
  onReordenar,
  loteHref,
  adicionarLabel = 'Adicionar produtos',
  className,
}: MenuCardapioAcoesProps) {
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center justify-end gap-1.5', className)}>
      {onReordenar ? (
        <button
          type="button"
          onClick={onReordenar}
          className="flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg border border-primary/50 bg-white px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 md:px-3 md:text-sm"
        >
          <span className="xl:hidden">Reordenar</span>
          <span className="hidden xl:inline">Reordenar cardápio</span>
        </button>
      ) : null}
      {loteHref ? (
        <Link
          href={loteHref}
          className="flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg border border-primary/50 bg-white px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 md:px-3 md:text-sm"
        >
          <span className="xl:hidden">Lote</span>
          <span className="hidden xl:inline">Produtos em lote</span>
        </Link>
      ) : null}
      <button
        type="button"
        onClick={onAdicionar}
        className="flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-primary px-3 text-xs font-semibold text-info transition-colors hover:bg-primary/90 md:gap-2 md:px-4 md:text-sm"
      >
        <span className="xl:hidden">Adicionar</span>
        <span className="hidden xl:inline">{adicionarLabel}</span>
        <span className="text-base md:text-lg">+</span>
      </button>
    </div>
  )
}
