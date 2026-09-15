'use client'

import {
  actionIconsConfig,
  menuQuickActionIconsConfig,
} from '@/src/presentation/components/features/produtos/ProdutosList/constants'
import { catalogRowGridClass } from './CatalogProductRow'
import { cn } from '@/src/shared/utils/cn'
import type { CatalogListVariant } from './types'

function Rotulo({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'block w-full truncate text-center text-[10px] font-semibold uppercase tracking-wide text-secondary-text',
        className
      )}
    >
      {children}
    </span>
  )
}

function AcoesHeader({ incluirCopiar }: { incluirCopiar: boolean }) {
  const defs = incluirCopiar ? actionIconsConfig : menuQuickActionIconsConfig
  return (
    <div className="flex w-full flex-nowrap items-center justify-center gap-2.5 md:gap-3" aria-hidden>
      {defs.map(def => (
        <span key={def.key} title={def.label} className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <span className="absolute left-1/2 top-1/2 w-max max-w-[3.5rem] -translate-x-1/2 -translate-y-1/2 text-center text-[9px] font-semibold leading-tight text-secondary-text">
            {def.headerLabel}
          </span>
        </span>
      ))}
    </div>
  )
}

/**
 * Cabeçalho desktop alinhado ao grid da lista (cadastro e cardápio).
 */
export function CatalogProductColumnHeader({
  variant,
  className,
}: {
  variant: CatalogListVariant
  className?: string
}) {
  const isMenu = variant === 'menu'

  return (
    <div
      role="row"
      aria-label="Colunas da lista"
      className={cn(
        'sticky top-0 z-20 hidden items-center justify-items-center gap-x-1.5 border-b border-gray-200 bg-gray-50/95 px-2 py-1.5 backdrop-blur-sm md:grid md:gap-x-2 md:px-4',
        catalogRowGridClass({
          isMenu,
          hideCodigo: false,
          hasActions: true,
          hasCategoria: !isMenu,
        }),
        className
      )}
    >
      {isMenu ? <span className="catalog-row-area-foto h-14 w-14 md:h-16 md:w-16" aria-hidden /> : null}
      <Rotulo className="catalog-row-area-nome min-w-0 max-w-[25ch] text-left">Nome</Rotulo>
      <Rotulo className="catalog-row-area-codigo w-[4.75rem]">Cód.</Rotulo>
      <div className="catalog-row-area-acoes w-full">
        <AcoesHeader incluirCopiar={!isMenu} />
      </div>
      {isMenu ? null : <Rotulo className="catalog-row-area-categ">Categoria</Rotulo>}
      <div className="catalog-row-area-meta flex w-full items-center justify-end gap-2 md:mr-4 md:gap-4">
        <Rotulo className="w-24">Valor</Rotulo>
        <Rotulo className="w-14">{isMenu ? 'Pause' : 'Status'}</Rotulo>
        {isMenu ? <span className="w-8" aria-hidden /> : null}
      </div>
    </div>
  )
}
