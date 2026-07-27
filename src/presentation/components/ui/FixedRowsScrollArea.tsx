'use client'

import { forwardRef } from 'react'
import { cn } from '@/src/shared/utils/cn'

export interface FixedRowsScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Cabeçalho fixo acima da área rolável (ex.: colunas da lista). */
  header?: React.ReactNode
  /** Rodapé opcional abaixo da área rolável. */
  footer?: React.ReactNode
  /** Quantidade de linhas visíveis antes de ativar o scroll interno. Padrão: 10. */
  visibleRows?: number
  /**
   * Altura estimada de cada linha em px (inclui o gap entre linhas).
   * Na lista de produtos em lote: minHeight 36 + gap-2 (8) ≈ 44.
   */
  rowHeightPx?: number
  /** Classes aplicadas na área com `overflow-y-auto`. */
  scrollClassName?: string
  children: React.ReactNode
}

/**
 * Container de lista com base fixa: mostra N linhas e rola o restante
 * no interior do componente (sem depender do scroll da página).
 *
 * O `ref` aponta para a área rolável — use-o em listeners de scroll
 * ou IntersectionObserver (infinite scroll).
 */
export const FixedRowsScrollArea = forwardRef<HTMLDivElement, FixedRowsScrollAreaProps>(
  function FixedRowsScrollArea(
    {
      header,
      footer,
      visibleRows = 10,
      rowHeightPx = 44,
      className,
      scrollClassName,
      children,
      style,
      ...props
    },
    ref
  ) {
    const bodyMaxHeightPx = Math.max(1, visibleRows) * Math.max(1, rowHeightPx)

    return (
      <div
        className={cn(
          'flex flex-col overflow-hidden rounded-lg border border-gray-200 border-b-2 border-b-gray-300 bg-info shadow-sm',
          className
        )}
        style={style}
        {...props}
      >
        {header ? <div className="shrink-0">{header}</div> : null}

        <div
          ref={ref}
          className={cn(
            'scrollbar-thin min-h-0 overflow-y-auto overscroll-contain',
            scrollClassName
          )}
          style={{ maxHeight: bodyMaxHeightPx }}
        >
          {children}
        </div>

        {footer ? <div className="shrink-0">{footer}</div> : null}
      </div>
    )
  }
)

FixedRowsScrollArea.displayName = 'FixedRowsScrollArea'
