'use client'

import { useState } from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { Settings } from 'lucide-react'
import { cn } from '@/src/shared/utils/cn'

export type CardGearMenuItemConfig = {
  id: string
  label: string
  onClick: () => void
  disabled?: boolean
  /** Estilo vermelho (ex.: Recusar convite) */
  tone?: 'default' | 'danger'
}

type CardGearMenuProps = {
  /** Desativa o botão da engrenagem (ex.: card bloqueado) */
  disabled?: boolean
  triggerAriaLabel: string
  triggerTitle?: string
  items: CardGearMenuItemConfig[]
  /** Classes extras no botão trigger */
  triggerClassName?: string
  /**
   * Chamado ao escolher um item, antes de fechar o menu e do onClick do item.
   * Útil no card com `onClick` no container (evita “clique fantasma” abrindo o app).
   */
  onBeforeMenuItemAction?: () => void
  /**
   * Chamado sempre que o menu fecha (item, backdrop, Escape).
   * Use no mesmo cenário do card clicável: o clique no backdrop pode repetir no card por baixo.
   */
  onMenuClose?: () => void
}

const menuItemSxBase = {
  minHeight: 28,
  py: 0.375,
  px: 1.25,
  fontSize: '0.65rem',
  fontWeight: 600,
} as const

/**
 * Menu dropdown acionado por ícone de engrenagem — mesmo padrão visual nos cards
 * Meus Apps (empresa / convite pendente).
 */
export function CardGearMenu({
  disabled,
  triggerAriaLabel,
  triggerTitle,
  items,
  triggerClassName,
  onBeforeMenuItemAction,
  onMenuClose,
}: CardGearMenuProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const aberto = Boolean(anchor)

  const fechar = () => setAnchor(null)

  const handleMenuClose = () => {
    setAnchor(null)
    onMenuClose?.()
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={e => {
          e.stopPropagation()
          if (!disabled) {
            setAnchor(e.currentTarget)
          }
        }}
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50',
          triggerClassName
        )}
        aria-label={triggerAriaLabel}
        title={triggerTitle ?? triggerAriaLabel}
        aria-haspopup="menu"
        aria-expanded={aberto}
      >
        <Settings className="h-4 w-4" aria-hidden />
      </button>
      <Menu
        anchorEl={anchor}
        open={aberto}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            className: 'min-w-0 py-0.5',
            elevation: 2,
            sx: { '& .MuiList-root': { py: 0 } },
          },
        }}
      >
        {items.map(item => (
          <MenuItem
            key={item.id}
            dense
            disabled={Boolean(item.disabled)}
            onClick={e => {
              e.stopPropagation()
              onBeforeMenuItemAction?.()
              fechar()
              item.onClick()
            }}
            sx={{
              ...menuItemSxBase,
              ...(item.tone === 'danger' ? { color: 'error.main' } : {}),
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
