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
  /** `discreto`: ícone ao lado da busca, sem o destaque da barra principal. */
  variante?: 'padrao' | 'discreto'
}

export function KanbanColunasMenu({
  colunasDoModo,
  ocultas,
  onSetColunaVisivel,
  contagemPorColuna,
  variante = 'padrao',
}: KanbanColunasMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const visiveisCount = colunasDoModo.filter(
    coluna => !ocultas.includes(coluna.id as ColunaKanbanId)
  ).length
  const discreto = variante === 'discreto'

  return (
    <>
      <button
        type="button"
        onClick={e => setAnchor(e.currentTarget)}
        className={
          discreto
            ? 'relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/70 hover:text-gray-700'
            : 'flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-primary'
        }
        title="Mostrar ou esconder colunas"
        aria-label="Mostrar ou esconder colunas"
        aria-expanded={Boolean(anchor)}
      >
        <MdViewColumn className={discreto ? 'h-4 w-4' : 'h-5 w-5'} />
        {discreto ? null : <span className="hidden sm:inline">Colunas</span>}
        <span
          className={
            discreto
              ? 'absolute -right-0.5 -top-0.5 min-w-[0.9rem] rounded-full bg-gray-400 px-1 text-[9px] font-medium leading-4 text-white'
              : 'rounded-full px-1.5 text-[11px] font-semibold text-white'
          }
          style={discreto ? undefined : { backgroundColor: KANBAN_BUTTON_COLOR }}
        >
          {visiveisCount}
        </span>
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
