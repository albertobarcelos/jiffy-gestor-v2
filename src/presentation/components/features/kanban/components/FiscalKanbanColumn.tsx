'use client'

import type { ReactNode } from 'react'
import { FormControl, MenuItem, Select } from '@mui/material'
import { MdArrowDownward, MdArrowUpward } from 'react-icons/md'
import { DroppableColumnContent } from './DroppableColumnContent'
import type {
  ColunaKanbanId,
  CriterioOrdenacaoKanban,
  DirecaoOrdenacaoKanban,
  KanbanColumn,
} from '../types'

interface FiscalKanbanColumnProps {
  column: KanbanColumn
  count: number
  criterioOrdenacao: CriterioOrdenacaoKanban
  direcaoOrdenacao: DirecaoOrdenacaoKanban
  onCriterioOrdenacaoChange: (columnId: ColunaKanbanId, criterio: CriterioOrdenacaoKanban) => void
  onToggleDirecaoOrdenacao: (columnId: ColunaKanbanId) => void
  onColumnScroll?: (columnId: ColunaKanbanId, event: React.UIEvent<HTMLDivElement>) => void
  columnFooter?: ReactNode
  children: ReactNode
}

export function FiscalKanbanColumn(props: FiscalKanbanColumnProps) {
  const {
    column,
    count,
    criterioOrdenacao,
    direcaoOrdenacao,
    onCriterioOrdenacaoChange,
    onToggleDirecaoOrdenacao,
    onColumnScroll,
    columnFooter,
    children,
  } = props
  const colId = column.id as ColunaKanbanId

  return (
    <div
      className="flex w-64 flex-shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50 sm:w-60 md:w-64 lg:w-96"
      style={{ height: 'calc(100vh - 180px)' }}
    >
      <div
        className={`px-3 py-2 ${column.color} border-b ${column.borderColor} flex flex-shrink-0 items-center justify-between`}
      >
        <div className="flex items-center gap-1.5">
          {column.icon}
          <h3 className="text-xs font-medium text-gray-900">
            {column.title} ({count})
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-medium text-gray-700">Ordem</span>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={criterioOrdenacao}
              onChange={e =>
                onCriterioOrdenacaoChange(colId, e.target.value as CriterioOrdenacaoKanban)
              }
              MenuProps={{
                PaperProps: {
                  sx: {
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb',
                    boxShadow:
                      '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
                  },
                },
              }}
              sx={{
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
              }}
            >
              <MenuItem value="data">Data</MenuItem>
              <MenuItem value="numero">Nº da venda</MenuItem>
              <MenuItem value="cliente">Cliente</MenuItem>
            </Select>
          </FormControl>
          <button
            type="button"
            className="flex h-6 w-5 items-center justify-center rounded bg-white/70 text-gray-700 hover:bg-white"
            onClick={() => onToggleDirecaoOrdenacao(colId)}
            aria-label="Alternar direção da ordenação"
            title="Alternar: crescente/decrescente"
          >
            {direcaoOrdenacao === 'asc' ? (
              <MdArrowUpward className="h-4 w-4" />
            ) : (
              <MdArrowDownward className="h-4 w-4" />
            )}
          </button>
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
    </div>
  )
}
