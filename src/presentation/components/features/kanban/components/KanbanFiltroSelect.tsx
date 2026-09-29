'use client'

import type { ReactNode } from 'react'
import { FormControl, Select } from '@mui/material'

const sxKanbanFiltroSelect = {
  minWidth: 'max-content',
  width: 'max-content',
  flexShrink: 0,
  margin: 0,
  '& .MuiOutlinedInput-root': {
    height: 32,
    minHeight: 32,
    width: 'max-content',
    borderRadius: '8px',
    backgroundColor: 'var(--color-info)',
    fontFamily: 'var(--font-general-sans), system-ui, sans-serif',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(0, 0, 0, 0.23)',
      borderWidth: 1,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(0, 0, 0, 0.23)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--color-primary)',
      borderWidth: 1,
    },
  },
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '8px',
    paddingRight: '26px !important',
    fontSize: '0.8125rem',
  },
} as const

export function KanbanFiltroSelect({
  ariaLabel,
  value,
  onChange,
  disabled,
  renderValor,
  children,
}: {
  ariaLabel: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  renderValor: (value: string) => string
  children: ReactNode
}) {
  return (
    <FormControl size="small" variant="outlined" sx={sxKanbanFiltroSelect} disabled={disabled}>
      <Select
        value={value}
        displayEmpty
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        aria-label={ariaLabel}
        renderValue={selected => (
          <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-[11px] font-light text-secondary-text">{ariaLabel}</span>
            <span>{renderValor(String(selected))}</span>
          </span>
        )}
      >
        {children}
      </Select>
    </FormControl>
  )
}
