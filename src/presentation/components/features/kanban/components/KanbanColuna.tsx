'use client'

import type { ReactNode } from 'react'
import { FormControl, MenuItem, Select } from '@mui/material'
import { MdArrowDownward, MdArrowUpward, MdVisibilityOff } from 'react-icons/md'
import { DroppableColumnContent } from './DroppableColumnContent'
import type {
  ColunaKanbanId,
  CriterioOrdenacaoKanban,
  DirecaoOrdenacaoKanban,
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
  direcaoOrdenacao: DirecaoOrdenacaoKanban
  onCriterioOrdenacaoChange: (columnId: ColunaKanbanId, criterio: CriterioOrdenacaoKanban) => void
  onToggleDirecaoOrdenacao: (columnId: ColunaKanbanId) => void
  onOcultarColuna?: (columnId: ColunaKanbanId) => void
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
    direcaoOrdenacao,
    onCriterioOrdenacaoChange,
    onToggleDirecaoOrdenacao,
    onOcultarColuna,
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
        className={`px-3 py-2 ${column.color} border-b ${column.borderColor} flex flex-shrink-0 items-center justify-between`}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {column.icon}
          <h3 className={`truncate text-xs font-medium ${column.tituloClasse ?? 'text-gray-900'}`}>
            {column.title} ({count})
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {mostrarFiltroStatusFiscal ? (
            <>
              <span className={`text-[11px] font-medium ${column.tituloClasse ?? 'text-gray-700'}`}>Status</span>
              <FormControl size="small" sx={{ minWidth: 118 }}>
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
                >
                  {OPCOES_FILTRO_STATUS_ENTREGUES.map(opcao => (
                    <MenuItem key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          ) : (
            <>
              <span className={`text-[11px] font-medium ${column.tituloClasse ?? 'text-gray-700'}`}>Ordem</span>
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select
                  value={criterioOrdenacao}
                  onChange={e =>
                    onCriterioOrdenacaoChange(colId, e.target.value as CriterioOrdenacaoKanban)
                  }
                  MenuProps={MENU_PROPS_CABECALHO_KANBAN}
                  sx={SX_SELECT_CABECALHO_KANBAN}
                >
                  <MenuItem value="data">Data</MenuItem>
                  <MenuItem value="numero">Nº da venda</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
          {onOcultarColuna ? (
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded bg-white/70 text-gray-700 hover:bg-white"
              onClick={() => onOcultarColuna(colId)}
              aria-label={`Esconder coluna ${column.title}`}
              title="Esconder coluna"
            >
              <MdVisibilityOff className="h-4 w-4" />
            </button>
          ) : null}
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

      {columnRodape ? <div className="flex-shrink-0">{columnRodape}</div> : null}
    </div>
  )
}
