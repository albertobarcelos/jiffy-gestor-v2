'use client'

import { useState } from 'react'
import { Menu, MenuItem } from '@mui/material'
import { MdDashboard, MdExpandMore, MdViewList, MdViewQuilt } from 'react-icons/md'
import {
  MODOS_VISUALIZACAO_KANBAN,
  ROTULO_MODO_VISUALIZACAO_KANBAN,
  type ModoVisualizacaoKanban,
} from '../utils/kanbanModoVisualizacao'

const ICONE_MODO: Record<ModoVisualizacaoKanban, typeof MdDashboard> = {
  quadro: MdDashboard,
  expedicao: MdViewQuilt,
  lista: MdViewList,
}

export interface KanbanModoVisualizacaoSelectProps {
  value: ModoVisualizacaoKanban
  onChange: (next: ModoVisualizacaoKanban) => void
}

export function KanbanModoVisualizacaoSelect({
  value,
  onChange,
}: KanbanModoVisualizacaoSelectProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const IconeAtual = ICONE_MODO[value]

  return (
    <>
      <button
        type="button"
        onClick={e => setAnchor(e.currentTarget)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50 hover:text-primary"
        title="Modo de visualização"
        aria-label="Modo de visualização do quadro"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
      >
        <IconeAtual className="h-4 w-4 text-primary" />
        <span>{ROTULO_MODO_VISUALIZACAO_KANBAN[value]}</span>
        <MdExpandMore className="h-4 w-4 text-gray-500" />
      </button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {MODOS_VISUALIZACAO_KANBAN.map(modo => {
          const Icone = ICONE_MODO[modo]
          const ativo = modo === value
          return (
            <MenuItem
              key={modo}
              selected={ativo}
              onClick={() => {
                onChange(modo)
                setAnchor(null)
              }}
            >
              <span className="flex items-center gap-2">
                <Icone className={`h-4 w-4 ${ativo ? 'text-primary' : 'text-gray-500'}`} />
                <span className={ativo ? 'font-semibold text-primary' : ''}>
                  {ROTULO_MODO_VISUALIZACAO_KANBAN[modo]}
                </span>
              </span>
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
