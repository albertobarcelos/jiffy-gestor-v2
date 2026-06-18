'use client'

import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import {
  MdAdd,
  MdCalendarToday,
  MdFilterAltOff,
  MdFilterList,
  MdRefresh,
  MdSearch,
  MdSettings,
} from 'react-icons/md'
import { KanbanModoVendasToggle, type ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type { OrigemFiltro } from '../types'

interface FiscalKanbanToolbarProps {
  searchInput: string
  onSearchInputChange: (value: string) => void
  onRefresh: () => void
  filtrosVisiveisMobile: boolean
  onToggleFiltrosMobile: () => void
  origemFilter: OrigemFiltro
  onOrigemFilterChange: (value: OrigemFiltro) => void
  terminalFilter: string
  onTerminalFilterChange: (value: string) => void
  terminais: { id: string; nome: string }[]
  isLoadingTerminais: boolean
  origemFilterDisabled?: boolean
  dataCriacaoInicio: Date | null
  dataCriacaoFim: Date | null
  onOpenCriacaoDatas: () => void
  dataFinalizacaoInicio: Date | null
  dataFinalizacaoFim: Date | null
  onOpenFinalizacaoDatas: () => void
  onClearFilters: () => void
  modoKanbanVendas: ModoKanbanVendas
  onModoKanbanVendasChange: (value: ModoKanbanVendas) => void
  onAbrirConfiguracoesDelivery: () => void
  onAbrirNovoPedido: () => void
}

const KANBAN_BUTTON_COLOR = '#530CA3'

const sxKanbanFiltroSelect = {
  minWidth: 140,
  '& .MuiOutlinedInput-root': {
    height: 32,
    minHeight: 32,
    borderRadius: '8px',
    backgroundColor: 'var(--color-info)',
    fontFamily: '"Nunito", sans-serif',
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
  '& .MuiInputLabel-root': {
    color: 'var(--color-secondary-text)',
    fontFamily: '"Nunito", sans-serif',
    fontSize: '0.875rem',
    fontWeight: 300,
  },
  '& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'var(--color-secondary-text)',
    fontWeight: 300,
  },
} as const

const MESES_ABREV = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const

function formatarDataHoraFiltroCurta(date: Date): string {
  const dia = String(date.getDate()).padStart(2, '0')
  const mes = MESES_ABREV[date.getMonth()]
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${dia}-${mes} ${h}:${min}`
}

function PeriodoSelecionadoResumo({
  inicio,
  fim,
}: {
  inicio: Date
  fim: Date
}) {
  return (
    <div className="flex shrink-0 flex-col gap-0 text-[11px] leading-snug text-primary/85 sm:text-xs">
      <span className="whitespace-nowrap">Dt. Ini.: {formatarDataHoraFiltroCurta(inicio)}</span>
      <span className="whitespace-nowrap">Dt. Fim: {formatarDataHoraFiltroCurta(fim)}</span>
    </div>
  )
}

export function FiscalKanbanToolbar(props: FiscalKanbanToolbarProps) {
  const {
    searchInput,
    onSearchInputChange,
    onRefresh,
    filtrosVisiveisMobile,
    onToggleFiltrosMobile,
    origemFilter,
    onOrigemFilterChange,
    terminalFilter,
    onTerminalFilterChange,
    terminais,
    isLoadingTerminais,
    origemFilterDisabled = false,
    dataCriacaoInicio,
    dataCriacaoFim,
    onOpenCriacaoDatas,
    dataFinalizacaoInicio,
    dataFinalizacaoFim,
    onOpenFinalizacaoDatas,
    onClearFilters,
    modoKanbanVendas,
    onModoKanbanVendasChange,
    onAbrirConfiguracoesDelivery,
    onAbrirNovoPedido,
  } = props

  return (
    <div className="bg-primary-background mt-2 flex-shrink-0 rounded-b-lg rounded-t-lg">
      <div className="flex justify-end py-2 sm:hidden">
        <button
          type="button"
          onClick={onToggleFiltrosMobile}
          className="font-nunito flex items-center gap-2 rounded-md px-3 py-1 text-sm text-white shadow-sm"
          style={{ backgroundColor: KANBAN_BUTTON_COLOR }}
          aria-expanded={filtrosVisiveisMobile}
        >
          {filtrosVisiveisMobile ? <MdFilterAltOff size={18} /> : <MdFilterList size={18} />}
          <span>{filtrosVisiveisMobile ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
        </button>
      </div>

      <div
        className={`flex flex-wrap items-end justify-center gap-x-1 gap-y-4 rounded-t-lg bg-custom-2 px-1 pb-2 pt-1.5 md:justify-start ${filtrosVisiveisMobile ? 'flex' : 'hidden sm:flex'}`}
      >
        <div className="flex flex-col gap-1">
          <div className="relative w-[250px] px-1 lg:w-[280px]">
            <MdSearch
              className="absolute left-2 top-1/2 -translate-y-1/2 text-secondary-text"
              size={20}
            />
            <input
              type="text"
              placeholder="Digite o código ou cliente"
              value={searchInput}
              onChange={e => onSearchInputChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onRefresh()}
              className="font-nunito h-8 w-full rounded-lg border bg-info pl-6 pr-4 text-sm shadow-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <FormControl size="small" variant="outlined" sx={sxKanbanFiltroSelect}>
            <InputLabel id="kanban-filtro-origem-label" shrink>
              Origem
            </InputLabel>
            <Select
              labelId="kanban-filtro-origem-label"
              label="Origem"
              value={origemFilter}
              onChange={e => onOrigemFilterChange(e.target.value as OrigemFiltro)}
              displayEmpty
              disabled={origemFilterDisabled}
              className="font-nunito"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="PDV">PDV</MenuItem>
              <MenuItem value="GESTOR">Gestor</MenuItem>
            </Select>
          </FormControl>
        </div>

        <div className="flex flex-col gap-1">
          <FormControl
            size="small"
            variant="outlined"
            sx={{ ...sxKanbanFiltroSelect, minWidth: 160 }}
          >
            <InputLabel id="kanban-filtro-terminal-label" shrink>
              Terminal
            </InputLabel>
            <Select
              labelId="kanban-filtro-terminal-label"
              label="Terminal"
              value={terminalFilter}
              onChange={e => onTerminalFilterChange(e.target.value)}
              displayEmpty
              disabled={isLoadingTerminais}
              className="font-nunito"
            >
              <MenuItem value="">Todos</MenuItem>
              {terminais.map(terminal => (
                <MenuItem key={terminal.id} value={terminal.id}>
                  {terminal.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenFinalizacaoDatas}
              className="font-nunito flex h-8 items-center gap-2 rounded-lg px-2 text-sm text-white transition-colors"
              style={{ backgroundColor: KANBAN_BUTTON_COLOR }}
            >
              <MdCalendarToday size={18} className="shrink-0" />
              Data Finalização
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenCriacaoDatas}
              className="font-nunito flex h-8 items-center gap-2 rounded-lg px-2 text-sm text-white transition-colors"
              style={{ backgroundColor: KANBAN_BUTTON_COLOR }}
            >
              <MdCalendarToday size={18} className="shrink-0" />
              Data Criação
            </button>
            {dataFinalizacaoInicio && dataFinalizacaoFim ? (
              <PeriodoSelecionadoResumo
                inicio={dataFinalizacaoInicio}
                fim={dataFinalizacaoFim}
              />
            ) : null}
            {dataCriacaoInicio && dataCriacaoFim ? (
              <PeriodoSelecionadoResumo inicio={dataCriacaoInicio} fim={dataCriacaoFim} />
            ) : null}
          </div>
        </div>

        <button
          onClick={onClearFilters}
          className="font-nunito flex h-8 items-center justify-center gap-2 rounded-lg border px-2 text-sm transition-colors"
          style={{ borderColor: KANBAN_BUTTON_COLOR, color: KANBAN_BUTTON_COLOR }}
        >
          <MdFilterAltOff size={18} />
          Limpar
        </button>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
          <KanbanModoVendasToggle value={modoKanbanVendas} onChange={onModoKanbanVendasChange} />
          <button
            type="button"
            onClick={onAbrirConfiguracoesDelivery}
            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-primary"
            title="Configurações do delivery"
            aria-label="Abrir configurações do delivery"
          >
            <MdSettings className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onAbrirNovoPedido}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: KANBAN_BUTTON_COLOR }}
          >
            <MdAdd className="h-4 w-4" />
            Novo Pedido
          </button>
        </div>
      </div>
    </div>
  )
}
