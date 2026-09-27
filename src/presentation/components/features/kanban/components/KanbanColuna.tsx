'use client'

import type { ReactNode } from 'react'
import { FormControl, MenuItem, Select } from '@mui/material'
import { DroppableColumnContent } from './DroppableColumnContent'
import type {
  ColunaKanbanId,
  CriterioOrdenacaoKanban,
  FiltroStatusEntreguesKanban,
  KanbanColumn,
} from '../types'
import { OPCOES_FILTRO_STATUS_ENTREGUES } from '../utils/kanbanDeliveryColumnConfig'
import { classesKanbanColunaCasco } from '../utils/kanbanQuadroLayout'
import type { SuperficieQuadroPedidos } from '@/src/presentation/gestor-pedidos/superficieQuadroPedidos'

const SX_SELECT_CABECALHO_KANBAN = {
  height: 26,
  fontSize: 12,
  borderRadius: '8px',
  backgroundColor: 'rgba(255,255,255,0.9)',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e5e7eb',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#d1d5db',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#d1d5db',
    borderWidth: '1px',
  },
} as const

const MENU_PROPS_CABECALHO_KANBAN = {
  PaperProps: {
    sx: {
      borderRadius: '4px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
    },
  },
}

interface KanbanColunaProps {
  column: KanbanColumn
  superficie: SuperficieQuadroPedidos
  count: number
  criterioOrdenacao: CriterioOrdenacaoKanban
  onCriterioOrdenacaoChange: (columnId: ColunaKanbanId, criterio: CriterioOrdenacaoKanban) => void
  onColumnScroll?: (columnId: ColunaKanbanId, event: React.UIEvent<HTMLDivElement>) => void
  columnFooter?: ReactNode
  /** Rodapé fixo abaixo da área rolável (ex.: ações em lote). */
  columnRodape?: ReactNode
  filtroStatusFiscal?: FiltroStatusEntreguesKanban
  onFiltroStatusFiscalChange?: (
    columnId: ColunaKanbanId,
    filtro: FiltroStatusEntreguesKanban
  ) => void
  children: ReactNode
}

export function KanbanColuna(props: KanbanColunaProps) {
  const {
    column,
    superficie,
    count,
    criterioOrdenacao,
    onCriterioOrdenacaoChange,
    onColumnScroll,
    columnFooter,
    columnRodape,
    filtroStatusFiscal,
    onFiltroStatusFiscalChange,
    children,
  } = props
  const colId = column.id as ColunaKanbanId
  const mostrarFiltroStatusFiscal = Boolean(onFiltroStatusFiscalChange && filtroStatusFiscal)

  return (
    <div className={classesKanbanColunaCasco(superficie)}>
      <div
        className={`relative flex-shrink-0 border-b ${column.borderColor} ${column.color}`}
      >
        <span
          className={`absolute right-1 top-1 z-10 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-white px-1.5 text-[13px] font-bold tabular-nums text-gray-900 shadow-sm ring-1 ring-black/10`}
          aria-label={`${count} pedidos`}
        >
          {count}
        </span>
        <div className="flex min-h-7 items-center gap-1 px-2 py-1 pr-9">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {column.icon}
            <h3
              className={`truncate text-xs font-semibold ${column.tituloClasse ?? 'text-gray-900'}`}
            >
              {column.title}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {mostrarFiltroStatusFiscal ? (
              <FormControl size="small" sx={{ minWidth: 96 }}>
                <Select
                  value={filtroStatusFiscal}
                  onChange={e =>
                    onFiltroStatusFiscalChange?.(
                      colId,
                      e.target.value as FiltroStatusEntreguesKanban
                    )
                  }
                  MenuProps={MENU_PROPS_CABECALHO_KANBAN}
                  sx={SX_SELECT_CABECALHO_KANBAN}
                  aria-label="Filtrar por status"
                >
                  {OPCOES_FILTRO_STATUS_ENTREGUES.map(opcao => (
                    <MenuItem key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <FormControl size="small" sx={{ minWidth: 72 }}>
                <Select
                  value={criterioOrdenacao}
                  onChange={e =>
                    onCriterioOrdenacaoChange(colId, e.target.value as CriterioOrdenacaoKanban)
                  }
                  MenuProps={MENU_PROPS_CABECALHO_KANBAN}
                  sx={SX_SELECT_CABECALHO_KANBAN}
                  aria-label="Ordenar coluna"
                >
                  <MenuItem value="data">Data</MenuItem>
                  <MenuItem value="numero">Nº da venda</MenuItem>
                </Select>
              </FormControl>
            )}
          </div>
        </div>
      </div>

      <DroppableColumnContent
        columnId={column.id}
        className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto bg-gray-200 p-2.5"
        onScroll={onColumnScroll ? event => onColumnScroll(colId, event) : undefined}
      >
        {count === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-gray-500">{column.placeholder}</p>
          </div>
        ) : (
          children
        )}
        {columnFooter}
      </DroppableColumnContent>

      {columnRodape ? <div className="flex-shrink-0">{columnRodape}</div> : null}
    </div>
  )
}
