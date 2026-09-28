'use client'

import { useState, type ReactNode } from 'react'
import { FormControl, MenuItem, Select } from '@mui/material'
import {
  MdAdd,
  MdFilterAltOff,
  MdFilterList,
  MdRefresh,
  MdSearch,
  MdSettings,
} from 'react-icons/md'
import { TbCashRegister } from 'react-icons/tb'
import { KanbanModoVendasToggle, type ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type {
  ColunaKanbanFiltroExtra,
  ColunaKanbanId,
  KanbanColumn,
  OrigemFiltro,
  TipoCanalFiltro,
  TipoEntregaFiltro,
} from '../types'
import type { ModoVisualizacaoKanban } from '../utils/kanbanModoVisualizacao'
import { CompartilharCardapioPublicoButton } from './CompartilharCardapioPublicoButton'
import { KanbanColunasMenu } from './KanbanColunasMenu'
import { KanbanModoVisualizacaoSelect } from './KanbanModoVisualizacaoSelect'
import { LojaAbertaToggle } from '@/src/presentation/components/features/delivery/LojaAbertaToggle'
import type { SuperficieQuadroPedidos } from '@/src/presentation/gestor-pedidos/superficieQuadroPedidos'
import {
  KANBAN_FILTRO_DATA_PRESET_OPCOES,
  type KanbanFiltroDataPreset,
} from '../utils/kanbanFiltroDataPresets'

export interface KanbanToolbarProps {
  searchInput: string
  onSearchInputChange: (value: string) => void
  onRefresh: () => void | Promise<void>
  filtrosVisiveisMobile: boolean
  onToggleFiltrosMobile: () => void
  origemFilter: OrigemFiltro
  onOrigemFilterChange: (value: OrigemFiltro) => void
  /** Canal unificado (`tipo` na API) — modo balcão. */
  tipoCanalFilter: TipoCanalFiltro
  onTipoCanalFilterChange: (value: TipoCanalFiltro) => void
  tipoEntregaFilter: TipoEntregaFiltro
  onTipoEntregaFilterChange: (value: TipoEntregaFiltro) => void
  /** Filtro extra balcão: Emitidas / Pendentes / Rejeitadas / Todas (`colunaKanban`). */
  colunaKanbanFiltro?: ColunaKanbanFiltroExtra
  onColunaKanbanFiltroChange?: (value: ColunaKanbanFiltroExtra) => void
  terminalFilter: string
  onTerminalFilterChange: (value: string) => void
  terminais: { id: string; nome: string }[]
  isLoadingTerminais: boolean
  origemFilterDisabled?: boolean
  tipoCanalFilterDisabled?: boolean
  periodoPreset: KanbanFiltroDataPreset
  onPeriodoPresetChange: (preset: KanbanFiltroDataPreset) => void
  periodoInicio: Date | null
  periodoFim: Date | null
  onClearFilters: () => void
  modoKanbanVendas: ModoKanbanVendas
  onModoKanbanVendasChange: (value: ModoKanbanVendas) => void
  modoVisualizacao: ModoVisualizacaoKanban
  onModoVisualizacaoChange: (value: ModoVisualizacaoKanban) => void
  onAbrirConfiguracoesDelivery: () => void
  onAbrirCaixaEstacao: () => void
  caixaAberta?: boolean | null
  onAbrirNovoPedido: () => void
  colunasDoModo: KanbanColumn[]
  colunasOcultas: readonly ColunaKanbanId[]
  onSetColunaVisivel: (id: ColunaKanbanId, visivel: boolean) => void
  contagemPorColuna: (id: ColunaKanbanId) => number
  superficie: SuperficieQuadroPedidos
}

const KANBAN_BUTTON_COLOR = '#530CA3'

const sxKanbanFiltroSelect = {
  minWidth: 0,
  width: 'max-content',
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

function KanbanFiltroSelect({
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

function textoPresetPeriodo(preset: string): string {
  return (
    KANBAN_FILTRO_DATA_PRESET_OPCOES.find(opcao => opcao.value === preset)?.label ?? 'Hoje'
  )
}

function FiltroDataPresetSelect({
  preset,
  onPresetChange,
  periodoResumo,
}: {
  preset: KanbanFiltroDataPreset
  onPresetChange: (preset: KanbanFiltroDataPreset) => void
  periodoResumo?: { inicio: Date; fim: Date } | null
}) {
  return (
    <div className="flex items-center gap-2">
      <KanbanFiltroSelect
        ariaLabel="Período"
        value={preset}
        onChange={value => onPresetChange(value as KanbanFiltroDataPreset)}
        renderValor={textoPresetPeriodo}
      >
        {KANBAN_FILTRO_DATA_PRESET_OPCOES.map(opcao => (
          <MenuItem key={opcao.value} value={opcao.value}>
            {opcao.label}
          </MenuItem>
        ))}
      </KanbanFiltroSelect>
      {preset === 'por_data' && periodoResumo ? (
        <PeriodoSelecionadoResumo inicio={periodoResumo.inicio} fim={periodoResumo.fim} />
      ) : null}
    </div>
  )
}

export function KanbanToolbar(props: KanbanToolbarProps) {
  const {
    searchInput,
    onSearchInputChange,
    onRefresh,
    filtrosVisiveisMobile,
    onToggleFiltrosMobile,
    origemFilter,
    onOrigemFilterChange,
    tipoCanalFilter,
    onTipoCanalFilterChange,
    tipoEntregaFilter,
    onTipoEntregaFilterChange,
    colunaKanbanFiltro: colunaKanbanFiltroProp,
    onColunaKanbanFiltroChange,
    terminalFilter,
    onTerminalFilterChange,
    terminais,
    isLoadingTerminais,
    origemFilterDisabled = false,
    tipoCanalFilterDisabled = false,
    periodoPreset,
    onPeriodoPresetChange,
    periodoInicio,
    periodoFim,
    onClearFilters,
    modoKanbanVendas,
    onModoKanbanVendasChange,
    modoVisualizacao,
    onModoVisualizacaoChange,
    onAbrirConfiguracoesDelivery,
    onAbrirCaixaEstacao,
    caixaAberta,
    onAbrirNovoPedido,
    colunasDoModo,
    colunasOcultas,
    onSetColunaVisivel,
    contagemPorColuna,
    superficie,
  } = props

  const isModoDelivery = modoKanbanVendas === 'delivery'
  const [refreshSpinning, setRefreshSpinning] = useState(false)
  const colunaKanbanFiltro = colunaKanbanFiltroProp ?? ''
  const onColunaKanbanFiltro = onColunaKanbanFiltroChange ?? (() => undefined)
  const noFredy = superficie === 'fredy'
  const buscaPlaceholder = noFredy ? 'Código, cliente ou telefone' : 'Buscar pedido'
  const buscaContainerClass =
    'flex min-w-0 shrink-0 flex-col w-full md:w-[17.57rem]'
  const buscaInputClass =
    'h-[2.2rem] w-full rounded-lg border bg-info pl-7 pr-3 text-sm shadow-sm'

  const campoBuscaPedido = (
    <div className={buscaContainerClass}>
      <div className="relative w-full px-1">
        <MdSearch
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
          size={22}
        />
        <input
          type="text"
          placeholder={buscaPlaceholder}
          value={searchInput}
          onChange={e => onSearchInputChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onRefresh()}
          className={buscaInputClass}
          aria-label={buscaPlaceholder}
        />
      </div>
    </div>
  )

  return (
    <div className="bg-primary-background mt-2 flex-shrink-0 rounded-b-lg rounded-t-lg pb-0">
      <div className="flex justify-end py-2 sm:hidden">
        <button
          type="button"
          onClick={onToggleFiltrosMobile}
          className="flex items-center gap-2 rounded-md px-3 py-1 text-sm text-white shadow-sm"
          style={{ backgroundColor: KANBAN_BUTTON_COLOR }}
          aria-expanded={filtrosVisiveisMobile}
        >
          {filtrosVisiveisMobile ? <MdFilterAltOff size={18} /> : <MdFilterList size={18} />}
          <span>{filtrosVisiveisMobile ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
        </button>
      </div>

      <div
        className={`flex flex-col gap-1.5 rounded-t-lg bg-custom-2 px-1 py-1.5 md:flex-row md:flex-wrap md:items-center md:justify-start md:gap-x-1 md:gap-y-1 ${filtrosVisiveisMobile ? 'flex' : 'hidden sm:flex'}`}
      >
        <div className="flex flex-wrap items-center justify-center gap-1 md:order-2">
        {!isModoDelivery ? (
          <KanbanFiltroSelect
            ariaLabel="Canal"
            value={tipoCanalFilter}
            onChange={value => onTipoCanalFilterChange(value as TipoCanalFiltro)}
            disabled={tipoCanalFilterDisabled}
            renderValor={value =>
              value === 'PDV' ? 'POS' : value === 'GESTOR' ? 'Balcão' : 'Todos'
            }
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="PDV">POS</MenuItem>
            <MenuItem value="GESTOR">Balcão</MenuItem>
          </KanbanFiltroSelect>
        ) : null}

        <KanbanFiltroSelect
          ariaLabel="Origem"
          value={origemFilter}
          onChange={value => onOrigemFilterChange(value as OrigemFiltro)}
          disabled={origemFilterDisabled}
          renderValor={value => {
            if (value === 'PDV') return 'POS'
            if (value === 'GESTOR') return isModoDelivery ? 'Gestor Delivery' : 'Gestor'
            if (value === 'JIFFY_DELIVERY') return 'Jiffy Delivery'
            if (value === 'AIQFOME') return 'Aiqfome'
            if (value === 'IFOOD') return 'iFood'
            return 'Todas'
          }}
        >
          <MenuItem value="">Todas</MenuItem>
          {!isModoDelivery ? <MenuItem value="PDV">POS</MenuItem> : null}
          <MenuItem value="GESTOR">
            {isModoDelivery ? 'Gestor Delivery' : 'Gestor'}
          </MenuItem>
          <MenuItem value="JIFFY_DELIVERY">Jiffy Delivery</MenuItem>
          <MenuItem value="AIQFOME">Aiqfome</MenuItem>
          <MenuItem value="IFOOD">iFood</MenuItem>
        </KanbanFiltroSelect>

        {isModoDelivery ? (
          <KanbanFiltroSelect
            ariaLabel="Tipo de entrega"
            value={tipoEntregaFilter}
            onChange={value => onTipoEntregaFilterChange(value as TipoEntregaFiltro)}
            renderValor={value =>
              value === 'entrega' ? 'Entrega' : value === 'retirada' ? 'Retirada' : 'Todos'
            }
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="entrega">Entrega</MenuItem>
            <MenuItem value="retirada">Retirada</MenuItem>
          </KanbanFiltroSelect>
        ) : null}

        {modoKanbanVendas === 'balcao' ? (
          <KanbanFiltroSelect
            ariaLabel="Filtro"
            value={colunaKanbanFiltro}
            onChange={value => onColunaKanbanFiltro(value as ColunaKanbanFiltroExtra)}
            renderValor={value => {
              if (value === 'PENDENTE_EMISSAO') return 'Pendentes'
              if (value === 'REJEITADAS') return 'Rejeitadas'
              if (value === 'TODAS') return 'Todas'
              return 'Emitidas'
            }}
          >
            <MenuItem value="">Emitidas</MenuItem>
            <MenuItem value="PENDENTE_EMISSAO">Pendentes</MenuItem>
            <MenuItem value="REJEITADAS">Rejeitadas</MenuItem>
            <MenuItem value="TODAS">Todas</MenuItem>
          </KanbanFiltroSelect>
        ) : null}

        {modoKanbanVendas === 'balcao' ? (
          <KanbanFiltroSelect
            ariaLabel="Terminal"
            value={terminalFilter}
            onChange={onTerminalFilterChange}
            disabled={isLoadingTerminais}
            renderValor={value =>
              terminais.find(terminal => terminal.id === value)?.nome ?? 'Todos'
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {terminais.map(terminal => (
              <MenuItem key={terminal.id} value={terminal.id}>
                {terminal.nome}
              </MenuItem>
            ))}
          </KanbanFiltroSelect>
        ) : null}

        <FiltroDataPresetSelect
          preset={periodoPreset}
          onPresetChange={onPeriodoPresetChange}
          periodoResumo={
            periodoInicio && periodoFim ? { inicio: periodoInicio, fim: periodoFim } : null
          }
        />

        <button
          onClick={onClearFilters}
          className="flex h-8 items-center justify-center gap-1 rounded-lg border px-1 text-sm transition-colors"
          style={{ borderColor: KANBAN_BUTTON_COLOR, color: KANBAN_BUTTON_COLOR }}
        >
          <MdFilterAltOff size={16} />
          Limpar
        </button>
        </div>

        {noFredy ? (
          <div className="flex w-full min-w-0 shrink-0 items-center gap-0.5 md:order-1 md:w-auto">
            {campoBuscaPedido}
            <KanbanColunasMenu
              variante="discreto"
              colunasDoModo={colunasDoModo}
              ocultas={colunasOcultas}
              onSetColunaVisivel={onSetColunaVisivel}
              contagemPorColuna={contagemPorColuna}
            />
          </div>
        ) : (
          <div className="shrink-0 md:order-1">{campoBuscaPedido}</div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-1 md:order-3 md:ml-auto">
          <button
            type="button"
            onClick={() => {
              setRefreshSpinning(true)
              void Promise.resolve(onRefresh()).finally(() => setRefreshSpinning(false))
            }}
            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-primary"
            title="Atualizar listagem"
            aria-label="Atualizar listagem do kanban"
          >
            <MdRefresh className={`h-5 w-5 ${refreshSpinning ? 'animate-spin' : ''}`} />
          </button>
          <CompartilharCardapioPublicoButton />
          <button
            type="button"
            onClick={onAbrirCaixaEstacao}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-primary"
            title={caixaAberta === true ? 'Caixa aberto' : caixaAberta === false ? 'Caixa fechado' : 'Meu caixa da estação'}
            aria-label="Abrir meu caixa"
          >
            <TbCashRegister
              className={`h-5 w-5 ${caixaAberta === true ? 'text-green-500' : caixaAberta === false ? 'text-red-500' : 'text-gray-600'}`}
            />
            Meu Caixa
          </button>
          {noFredy ? (
            <KanbanModoVisualizacaoSelect
              value={modoVisualizacao}
              onChange={onModoVisualizacaoChange}
            />
          ) : null}
          {noFredy ? null : (
            <KanbanModoVendasToggle value={modoKanbanVendas} onChange={onModoKanbanVendasChange} />
          )}
          {isModoDelivery ? <LojaAbertaToggle /> : null}
          <button
            type="button"
            onClick={onAbrirConfiguracoesDelivery}
            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-primary"
            title={
              isModoDelivery ? 'Configurações do delivery' : 'Configurações do balcão'
            }
            aria-label={
              isModoDelivery
                ? 'Abrir configurações do delivery'
                : 'Abrir configurações do balcão'
            }
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
            Pedido
          </button>
        </div>
      </div>
    </div>
  )
}
