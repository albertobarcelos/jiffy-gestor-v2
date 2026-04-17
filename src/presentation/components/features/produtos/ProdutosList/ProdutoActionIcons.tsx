'use client'

import type { Produto } from '@/src/domain/entities/Produto'
import type { ToggleField } from '@/src/shared/types/produto'
import { actionIconsConfig } from './constants'

interface ProdutoActionIconsProps {
  produto: Produto
  toggleStates: Record<ToggleField, boolean>
  savingToggleState?: Partial<Record<ToggleField, boolean>>
  variant: 'desktop' | 'mobile-row1' | 'mobile-row2'
  onToggleBoolean: (field: ToggleField, value: boolean) => void
  onOpenComplementosModal: () => void
  onOpenImpressorasModal: () => void
  onCopyProduto: () => void
}

const ICON_SIZE: Record<ProdutoActionIconsProps['variant'], string> = {
  desktop: 'w-7 h-7 text-base',
  'mobile-row1': 'w-4 h-4 text-xs',
  'mobile-row2': 'w-4 h-4 text-xs',
}

const VARIANT_SLICE: Record<ProdutoActionIconsProps['variant'], [number, number]> = {
  desktop: [0, 9],
  'mobile-row1': [0, 3],
  'mobile-row2': [3, 9],
}

export function ProdutoActionIcons({
  produto,
  toggleStates,
  savingToggleState,
  variant,
  onToggleBoolean,
  onOpenComplementosModal,
  onOpenImpressorasModal,
  onCopyProduto,
}: ProdutoActionIconsProps) {
  const sizeClass = ICON_SIZE[variant]
  const [start, end] = VARIANT_SLICE[variant]
  const icons = actionIconsConfig.slice(start, end)
  const produtoId = produto.getId()

  return (
    <>
      {icons.map(({ key, label, Icon, field, modal, action }) => {
        const IconEl = Icon as React.ComponentType<{ className?: string }>
        const baseClass = `${sizeClass} rounded-full flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/80`

        if (field) {
          const isActive = toggleStates[field]
          const isLoading = Boolean(savingToggleState?.[field])
          return (
            <button
              key={`${produtoId}-${key}`}
              type="button"
              title={label}
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation()
                onToggleBoolean(field, !isActive)
              }}
              className={`${baseClass} ${
                isActive
                  ? 'bg-primary text-white border border-primary'
                  : 'bg-gray-300 text-white border border-transparent'
              } ${isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-primary/80 hover:text-white'}`}
            >
              <IconEl />
            </button>
          )
        }

        if (modal) {
          const handleClick = modal === 'complementos' ? onOpenComplementosModal : onOpenImpressorasModal
          return (
            <button
              key={`${produtoId}-${key}`}
              type="button"
              title={label}
              onClick={(e) => {
                e.stopPropagation()
                handleClick()
              }}
              className={`${baseClass} bg-gray-100 border border-primary text-[var(--color-primary)] hover:bg-primary/10`}
            >
              <IconEl />
            </button>
          )
        }

        if (action === 'copy') {
          return (
            <button
              key={`${produtoId}-${key}`}
              type="button"
              title={label}
              onClick={(e) => {
                e.stopPropagation()
                onCopyProduto()
              }}
              className={`${baseClass} bg-gray-100 border border-primary text-[var(--color-primary)] hover:bg-primary/10`}
            >
              <IconEl />
            </button>
          )
        }

        return (
          <span
            key={`${produtoId}-${key}`}
            title={label}
            className={`${baseClass} bg-gray-100 text-[var(--color-primary)]`}
          >
            <IconEl />
          </span>
        )
      })}
    </>
  )
}
