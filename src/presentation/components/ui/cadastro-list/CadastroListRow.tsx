'use client'

import { cn } from '@/src/shared/utils/cn'

/**
 * Variantes de grade das listas de cadastro ERP.
 * Cada feature passa a variante; colunas específicas ficam nos children.
 */
export type CadastroListVariant = 'grupos-complementos' | 'complementos'

const CADASTRO_LIST_MAX_WIDTH = 'max-w-[1400px]'

const CADASTRO_LIST_GRID: Record<CadastroListVariant, string> = {
  'grupos-complementos':
    'grid-cols-[auto_minmax(0,1fr)_auto_auto] md:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_3.5rem]',
  complementos:
    'grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] md:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,8.5rem)_minmax(0,7.5rem)_3.5rem]',
}

type CadastroListShellProps = {
  children: React.ReactNode
  className?: string
}

/** Container com largura máxima compartilhada das listas de cadastro. */
export function CadastroListShell({ children, className }: CadastroListShellProps) {
  return (
    <div className={cn('mx-auto w-full', CADASTRO_LIST_MAX_WIDTH, className)}>{children}</div>
  )
}

type CadastroListHeaderProps = {
  variant: CadastroListVariant
  children: React.ReactNode
  className?: string
}

/** Cabeçalho alinhado à mesma grade da linha. */
export function CadastroListHeader({ variant, children, className }: CadastroListHeaderProps) {
  return (
    <div
      className={cn(
        'grid h-10 items-center gap-x-2 rounded-lg bg-custom-2 px-2 md:gap-x-2.5 md:px-4',
        CADASTRO_LIST_GRID[variant],
        className
      )}
    >
      {children}
    </div>
  )
}

type CadastroListRowProps = {
  variant: CadastroListVariant
  index: number
  onClick?: () => void
  children: React.ReactNode
  className?: string
  /** Quando false, a linha não é clicável. Default true se onClick existir. */
  interactive?: boolean
}

/**
 * Linha padronizada das listas de cadastro (zebra, padding, hover, grade).
 * Colunas específicas (nome, ações, status…) vêm como children — opções “escondidas”
 * por feature via composição, não por forks de layout.
 */
export function CadastroListRow({
  variant,
  index,
  onClick,
  children,
  className,
  interactive,
}: CadastroListRowProps) {
  const clickable = interactive ?? Boolean(onClick)
  const zebra = index % 2 === 0 ? 'bg-gray-50' : 'bg-white'

  return (
    <div className="mb-2 rounded-lg bg-info">
      <div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          clickable && onClick
            ? e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick()
                }
              }
            : undefined
        }
        className={cn(
          'grid items-center gap-x-2 gap-y-2 rounded-lg px-2 py-2 transition-shadow md:gap-x-2.5 md:px-4 md:py-3',
          zebra,
          clickable && 'cursor-pointer hover:bg-secondary-bg/15',
          CADASTRO_LIST_GRID[variant],
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** Célula de título no header (espaçador da miniatura). */
export function CadastroListThumbSpacer() {
  return <div className="h-11 w-11 shrink-0 md:h-12 md:w-12" aria-hidden />
}

export function CadastroListHeaderLabel({
  children,
  className,
  hideOnMobile,
}: {
  children: React.ReactNode
  className?: string
  hideOnMobile?: boolean
}) {
  return (
    <div
      className={cn(
        'font-semibold text-xs text-primary-text md:text-sm',
        hideOnMobile && 'hidden md:flex',
        className
      )}
    >
      {children}
    </div>
  )
}
