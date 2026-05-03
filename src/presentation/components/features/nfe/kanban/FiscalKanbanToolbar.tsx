'use client'

import { FormControl, MenuItem, Select } from '@mui/material'
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
import type { OrigemFiltro, PeriodoOpcao } from './types'

interface FiscalKanbanToolbarProps {
  searchInput: string
  onSearchInputChange: (value: string) => void
  onRefresh: () => void
  filtrosVisiveisMobile: boolean
  onToggleFiltrosMobile: () => void
  origemFilter: OrigemFiltro
  onOrigemFilterChange: (value: OrigemFiltro) => void
  dataFinalizacaoPeriodo: PeriodoOpcao
  onDataFinalizacaoPeriodoChange: (value: PeriodoOpcao) => void
  periodo: PeriodoOpcao
  onPeriodoChange: (value: PeriodoOpcao) => void
  statusFiscalFilter: string
  onStatusFiscalFilterChange: (value: string) => void
  onOpenDatasModal: () => void
  onClearFilters: () => void
  modoKanbanVendas: ModoKanbanVendas
  onModoKanbanVendasChange: (value: ModoKanbanVendas) => void
  onAbrirConfiguracoesDelivery: () => void
  onAbrirNovoPedido: () => void
}

const PERIODO_OPTIONS: PeriodoOpcao[] = [
  'Todos',
  'Hoje',
  'Ontem',
  'Últimos 7 Dias',
  'Mês Atual',
  'Mês Passado',
  'Últimos 30 Dias',
  'Últimos 60 Dias',
  'Últimos 90 Dias',
]

const KANBAN_BUTTON_COLOR = '#530CA3'

export function FiscalKanbanToolbar(props: FiscalKanbanToolbarProps) {
  const {
    searchInput,
    onSearchInputChange,
    onRefresh,
    filtrosVisiveisMobile,
    onToggleFiltrosMobile,
    origemFilter,
    onOrigemFilterChange,
    dataFinalizacaoPeriodo,
    onDataFinalizacaoPeriodoChange,
    periodo,
    onPeriodoChange,
    statusFiscalFilter,
    onStatusFiscalFilterChange,
    onOpenDatasModal,
    onClearFilters,
    modoKanbanVendas,
    onModoKanbanVendasChange,
    onAbrirConfiguracoesDelivery,
    onAbrirNovoPedido,
  } = props

  return (
    <div className="bg-primary-background flex-shrink-0 rounded-b-lg rounded-t-lg md:px-2">
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
          <label className="font-nunito pl-2 text-xs text-secondary-text">Pesquisar</label>

          <div className="relative w-full max-w-full px-1 lg:max-w-[250px]">
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
          <label className="font-nunito text-xs text-secondary-text">Origem</label>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={origemFilter}
              onChange={e => onOrigemFilterChange(e.target.value as OrigemFiltro)}
              displayEmpty
              sx={{
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-info)',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
              }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="PDV">PDV</MenuItem>
              <MenuItem value="GESTOR">Gestor</MenuItem>
            </Select>
          </FormControl>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-nunito text-xs text-secondary-text">Data finalização</label>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={dataFinalizacaoPeriodo}
              onChange={e => onDataFinalizacaoPeriodoChange(e.target.value as PeriodoOpcao)}
              sx={{
                height: '32px',
                backgroundColor: '#FFFFFF',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
              }}
            >
              {PERIODO_OPTIONS.map(option => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-nunito text-xs text-secondary-text">Data criação</label>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={periodo}
              onChange={e => onPeriodoChange(e.target.value as PeriodoOpcao)}
              sx={{
                height: '32px',
                backgroundColor: '#FFFFFF',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
              }}
            >
              {PERIODO_OPTIONS.map(option => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
              <MenuItem value="Datas Personalizadas">Datas personalizadas</MenuItem>
            </Select>
          </FormControl>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-nunito text-xs text-secondary-text">Status fiscal</label>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={statusFiscalFilter}
              onChange={e => onStatusFiscalFilterChange(e.target.value)}
              displayEmpty
              sx={{
                height: '32px',
                backgroundColor: '#FFFFFF',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
              }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="PENDENTE">Pendente</MenuItem>
              <MenuItem value="PENDENTE_EMISSAO">Pendente emissão</MenuItem>
              <MenuItem value="EMITINDO">Emitindo</MenuItem>
              <MenuItem value="EMITIDA">Emitida</MenuItem>
              <MenuItem value="REJEITADA">Rejeitada</MenuItem>
              <MenuItem value="CANCELADA">Cancelada</MenuItem>
            </Select>
          </FormControl>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-nunito text-xs text-secondary-text">Período (criação)</label>
          <button
            type="button"
            onClick={onOpenDatasModal}
            className="font-nunito flex h-8 items-center gap-2 rounded-lg px-4 text-sm text-white transition-colors"
            style={{ backgroundColor: KANBAN_BUTTON_COLOR }}
          >
            <MdCalendarToday size={18} />
            Por datas
          </button>
        </div>

        <button
          onClick={onClearFilters}
          className="font-nunito flex h-8 items-center justify-center gap-2 rounded-lg border px-4 text-sm transition-colors"
          style={{ borderColor: KANBAN_BUTTON_COLOR, color: KANBAN_BUTTON_COLOR }}
        >
          <MdFilterAltOff size={18} />
          Limpar filtros
        </button>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={onRefresh}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
            title="Atualizar"
          >
            <MdRefresh className="h-5 w-5" />
          </button>
          <KanbanModoVendasToggle value={modoKanbanVendas} onChange={onModoKanbanVendasChange} />
          <button
            type="button"
            onClick={onAbrirConfiguracoesDelivery}
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-primary"
            title="Configurações do delivery"
            aria-label="Abrir configurações do delivery"
          >
            <MdSettings className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onAbrirNovoPedido}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors"
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
