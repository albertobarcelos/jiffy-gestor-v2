'use client'

import { useState } from 'react'
import { Checkbox, FormControlLabel, Menu, MenuItem } from '@mui/material'
import { MdViewColumn } from 'react-icons/md'
import type { ColunaKanbanId, KanbanColumn } from '../types'
import { podeOcultarColuna } from '../utils/kanbanColunasVisibilidade'

const KANBAN_BUTTON_COLOR = '#530CA3'

export interface KanbanColunasMenuProps {
  colunasDoModo: KanbanColumn[]
  ocultas: readonly ColunaKanbanId[]
  onSetColunaVisivel: (id: ColunaKanbanId, visivel: boolean) => void
  contagemPorColuna: (id: ColunaKanbanId) => number
}

export function KanbanColunasMenu({
  colunasDoModo,
  ocultas,
  onSetColunaVisivel,
  contagemPorColuna,
}: KanbanColunasMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const ocultasCount = ocultas.filter(id => colunasDoModo.some(c => c.id === id)).length

  return (
    <>
      <button
        type="button"
        onClick={e => setAnchor(e.currentTarget)}
        className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-primary"
        title="Mostrar ou esconder colunas"
        aria-label="Mostrar ou esconder colunas"
        aria-expanded={Boolean(anchor)}
      >
        <MdViewColumn className="h-5 w-5" />
        <span className="hidden sm:inline">Colunas</span>
        {ocultasCount > 0 ? (
          <span
            className="rounded-full px-1.5 text-[11px] font-semibold text-white"
            style={{ backgroundColor: KANBAN_BUTTON_COLOR }}
          >
            {ocultasCount}
          </span>
        ) : null}
      </button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 260,
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              mt: 0.5,
            },
          },
        }}
      >
        {colunasDoModo.map(coluna => {
          const id = coluna.id as ColunaKanbanId
          const visivel = !ocultas.includes(id)
          const bloquearOcultar = visivel && !podeOcultarColuna(colunasDoModo, ocultas, id)
          const total = contagemPorColuna(id)
          return (
            <MenuItem key={coluna.id} dense disableRipple sx={{ py: 0.25 }}>
              <FormControlLabel
                sx={{ width: '100%', mr: 0, gap: 0.5 }}
                control={
                  <Checkbox
                    size="small"
                    checked={visivel}
                    disabled={bloquearOcultar}
                    onChange={e => onSetColunaVisivel(id, e.target.checked)}
                  />
                }
                label={
                  <span className="flex items-center gap-1.5 text-sm">
                    {coluna.icon}
                    <span>{coluna.title}</span>
                    <span className="text-xs text-gray-500">({total})</span>
                  </span>
                }
              />
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
