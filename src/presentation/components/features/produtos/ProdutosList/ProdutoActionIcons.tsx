'use client'

import { useEffect, useRef, useState } from 'react'
import { Tooltip as MuiTooltip } from '@mui/material'
import { MdMoreHoriz } from 'react-icons/md'
import type { Produto } from '@/src/domain/entities/Produto'
import type { ToggleField } from '@/src/shared/types/produto'
import { actionIconsConfig, type ActionIconDef } from './constants'

interface ProdutoActionIconsProps {
  produto: Produto
  toggleStates: Record<ToggleField, boolean>
  variant: 'desktop' | 'mobile'
  onToggleBoolean: (produtoId: string, field: ToggleField, value: boolean) => void
  onCopyProduto: (produtoId: string) => void
}

const ICON_BTN =
  'rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/80'

const TOOLTIP_SLOT = {
  tooltip: {
    sx: {
      bgcolor: '#1f2937',
      color: '#fff',
      fontSize: 12,
      lineHeight: 1.4,
      maxWidth: 280,
      px: 1.5,
      py: 1,
      borderRadius: 1.5,
    },
  },
}

function ActionButton({
  def,
  sizeClass,
  isActive,
  onClick,
}: {
  def: ActionIconDef
  sizeClass: string
  isActive?: boolean
  onClick: () => void
}) {
  const Icon = def.Icon
  const active = Boolean(isActive)

  return (
    <MuiTooltip title={def.label} arrow placement="top" slotProps={TOOLTIP_SLOT}>
      <button
        type="button"
        aria-label={def.ariaLabel}
        aria-pressed={def.field ? active : undefined}
        onClick={e => {
          e.stopPropagation()
          onClick()
        }}
        className={`${ICON_BTN} ${sizeClass} ${
          def.field
            ? active
              ? 'bg-secondary text-white border border-secondary'
              : 'bg-white text-secondary border border-secondary/60 hover:bg-secondary/10'
            : 'bg-white text-secondary border border-secondary/60 hover:bg-secondary/10'
        }`}
      >
        <Icon />
      </button>
    </MuiTooltip>
  )
}

const DESKTOP_SIZE = 'w-8 h-8 text-lg'
const MOBILE_SIZE = 'w-7 h-7 text-base'
const MOBILE_VISIBLE = 3

export function ProdutoActionIcons({
  produto,
  toggleStates,
  variant,
  onToggleBoolean,
  onCopyProduto,
}: ProdutoActionIconsProps) {
  const produtoId = produto.getId()
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const isMobile = variant === 'mobile'
  const sizeClass = isMobile ? MOBILE_SIZE : DESKTOP_SIZE

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  const visible = isMobile ? actionIconsConfig.slice(0, MOBILE_VISIBLE) : actionIconsConfig
  const overflow = isMobile ? actionIconsConfig.slice(MOBILE_VISIBLE) : []

  const runAction = (def: ActionIconDef) => {
    if (def.field) {
      onToggleBoolean(produtoId, def.field, !toggleStates[def.field])
      return
    }
    if (def.action === 'copy') {
      onCopyProduto(produtoId)
    }
  }

  return (
    <div ref={rootRef} className="relative flex items-center gap-1 md:gap-1.5">
      {visible.map(def => (
        <ActionButton
          key={`${produtoId}-${def.key}`}
          def={def}
          sizeClass={sizeClass}
          isActive={def.field ? toggleStates[def.field] : undefined}
          onClick={() => runAction(def)}
        />
      ))}

      {overflow.length > 0 ? (
        <>
          <MuiTooltip title="Mais ações" arrow placement="top" slotProps={TOOLTIP_SLOT}>
            <button
              type="button"
              aria-label="Mais ações"
              aria-expanded={menuOpen}
              onClick={e => {
                e.stopPropagation()
                setMenuOpen(open => !open)
              }}
              className={`${ICON_BTN} ${sizeClass} bg-white text-secondary border border-secondary/60 hover:bg-secondary/10`}
            >
              <MdMoreHoriz />
            </button>
          </MuiTooltip>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute left-0 top-full z-30 mt-1 flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg"
              onClick={e => e.stopPropagation()}
            >
              {overflow.map(def => (
                <ActionButton
                  key={`${produtoId}-more-${def.key}`}
                  def={def}
                  sizeClass={sizeClass}
                  isActive={def.field ? toggleStates[def.field] : undefined}
                  onClick={() => {
                    runAction(def)
                    setMenuOpen(false)
                  }}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
