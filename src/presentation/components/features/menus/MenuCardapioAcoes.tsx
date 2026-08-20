'use client'

import { cn } from '@/src/shared/utils/cn'
import Link from 'next/link'

interface MenuCardapioAcoesProps {
  onCadastrar: () => void
  onAdicionar: () => void
  loteHref?: string
  className?: string
}

export function MenuCardapioAcoes({
  onCadastrar,
  onAdicionar,
  loteHref,
  className,
}: MenuCardapioAcoesProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>
      {loteHref ? (
        <Link
          href={loteHref}
          className="flex h-8 items-center gap-2 rounded-lg border border-primary/50 bg-white px-[16px] text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          Produtos em lote
        </Link>
      ) : null}
      <button
        type="button"
        onClick={onCadastrar}
        className="flex h-8 items-center gap-2 rounded-lg border border-primary bg-info px-[20px] text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        Cadastrar produto neste cardápio
        <span className="text-lg">+</span>
      </button>
      <button
        type="button"
        onClick={onAdicionar}
        className="flex h-8 items-center gap-2 rounded-lg bg-primary px-[30px] text-sm font-semibold text-info transition-colors hover:bg-primary/90"
      >
        Adicionar produtos
        <span className="text-lg">+</span>
      </button>
    </div>
  )
}
