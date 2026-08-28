'use client'

import { useState } from 'react'
import { MdModeEdit } from 'react-icons/md'
import type { Menu } from '@/src/shared/types/menus'

export interface TerminaisGroupMenuSelectorProps {
  currentMenuId?: string
  menus: Menu[]
  disabled?: boolean
  formatMenuLabel: (menu: Menu) => string
  onRequestChange: (newMenuId: string) => void
}

export function TerminaisGroupMenuSelector({
  currentMenuId,
  menus,
  disabled = false,
  formatMenuLabel,
  onRequestChange,
}: TerminaisGroupMenuSelectorProps) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <button
        type="button"
        title="Alterar menu de todos os terminais deste grupo"
        onClick={event => {
          event.stopPropagation()
          if (!disabled) setEditing(true)
        }}
        disabled={disabled}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 text-primary-text transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Alterar menu do grupo"
      >
        <MdModeEdit size={14} />
      </button>
    )
  }

  return (
    <select
      autoFocus
      defaultValue=""
      onClick={event => event.stopPropagation()}
      onMouseDown={event => event.stopPropagation()}
      onChange={event => {
        const value = event.target.value
        setEditing(false)
        if (value && value !== (currentMenuId ?? '')) {
          onRequestChange(value)
        }
      }}
      onBlur={() => setEditing(false)}
      disabled={disabled}
      className="h-7 max-w-[200px] rounded-lg border border-gray-200 bg-white px-2 text-xs text-primary-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Selecionar menu para todos os terminais do grupo"
    >
      <option value="" disabled>
        Escolher menu…
      </option>
      {menus
        .filter(menu => menu.id !== currentMenuId)
        .map(menu => (
          <option key={menu.id} value={menu.id}>
            {formatMenuLabel(menu)}
          </option>
        ))}
    </select>
  )
}
