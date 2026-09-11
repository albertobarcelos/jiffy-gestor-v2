'use client'

import { Tooltip } from '@mui/material'
import { cn } from '@/src/shared/utils/cn'
import type { ActionIconDef } from '@/src/presentation/components/features/produtos/ProdutosList/constants'

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

const ICON_BTN =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/80'

/** Botão circular das ações rápidas (cadastro e cardápio). */
export function CatalogQuickActionButton({
  def,
  active,
  disabled,
  onClick,
}: {
  def: ActionIconDef
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const Icon = def.Icon
  const ligado = Boolean(active)

  return (
    <div className="flex h-8 w-8 items-center justify-center">
      <Tooltip
        title={def.label}
        arrow
        placement="top"
        enterDelay={400}
        enterNextDelay={400}
        disableInteractive
        slotProps={TOOLTIP_SLOT}
      >
        <button
          type="button"
          disabled={disabled}
          aria-label={def.ariaLabel}
          aria-pressed={def.field ? ligado : undefined}
          onClick={e => {
            e.stopPropagation()
            onClick()
          }}
          className={cn(
            ICON_BTN,
            ligado
              ? 'border-secondary bg-secondary text-white hover:bg-secondary'
              : 'border-secondary/60 bg-white text-secondary hover:bg-secondary/10',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <Icon className="h-[1.05em] w-[1.05em]" />
        </button>
      </Tooltip>
    </div>
  )
}
