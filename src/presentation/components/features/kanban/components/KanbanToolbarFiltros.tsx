'use client'

import { MenuItem } from '@mui/material'
import { MdFilterAltOff, MdSearch } from 'react-icons/md'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type {
  ColunaKanbanFiltroExtra,
  ColunaKanbanId,
  KanbanColumn,
  OrigemFiltro,
  TipoCanalFiltro,
  TipoEntregaFiltro,
} from '../types'
import type { KanbanFiltroDataPreset } from '../utils/kanbanFiltroDataPresets'
import { KanbanColunasMenu } from './KanbanColunasMenu'
import { kanbanToolbarTemFiltroAtivo } from '../utils/kanbanToolbarTemFiltroAtivo'
import { KanbanFiltroPeriodo } from './KanbanFiltroPeriodo'
import { KanbanFiltroSelect } from './KanbanFiltroSelect'
import { KANBAN_BUTTON_COLOR } from './kanbanToolbarTheme'

export function KanbanToolbarFiltros({
  isModoDelivery,
  noFredy,
  searchInput,
  onSearchInputChange,
  onRefresh,
  origemFilter,
  onOrigemFilterChange,
  tipoCanalFilter,
  onTipoCanalFilterChange,
  tipoEntregaFilter,
  onTipoEntregaFilterChange,
  colunaKanbanFiltro,
  onColunaKanbanFiltro,
  terminalFilter,
  onTerminalFilterChange,
  terminais,
  isLoadingTerminais,
  origemFilterDisabled,
  tipoCanalFilterDisabled,
  periodoPreset,
  onPeriodoPresetChange,
  periodoInicio,
  periodoFim,
  onClearFilters,
  modoKanbanVendas,
  colunasDoModo,
  colunasOcultas,
  onSetColunaVisivel,
  contagemPorColuna,
}: {
  isModoDelivery: boolean
  noFredy: boolean
  searchInput: string
  onSearchInputChange: (value: string) => void
  onRefresh: () => void | Promise<void>
  origemFilter: OrigemFiltro
  onOrigemFilterChange: (value: OrigemFiltro) => void
  tipoCanalFilter: TipoCanalFiltro
  onTipoCanalFilterChange: (value: TipoCanalFiltro) => void
  tipoEntregaFilter: TipoEntregaFiltro
  onTipoEntregaFilterChange: (value: TipoEntregaFiltro) => void
  colunaKanbanFiltro: ColunaKanbanFiltroExtra | ''
  onColunaKanbanFiltro: (value: ColunaKanbanFiltroExtra) => void
  terminalFilter: string
  onTerminalFilterChange: (value: string) => void
  terminais: { id: string; nome: string }[]
  isLoadingTerminais: boolean
  origemFilterDisabled: boolean
  tipoCanalFilterDisabled: boolean
  periodoPreset: KanbanFiltroDataPreset
  onPeriodoPresetChange: (preset: KanbanFiltroDataPreset) => void
  periodoInicio: Date | null
  periodoFim: Date | null
  onClearFilters: () => void
  modoKanbanVendas: ModoKanbanVendas
  colunasDoModo: KanbanColumn[]
  colunasOcultas: readonly ColunaKanbanId[]
  onSetColunaVisivel: (id: ColunaKanbanId, visivel: boolean) => void
  contagemPorColuna: (id: ColunaKanbanId) => number
}) {
  const buscaPlaceholder = noFredy ? 'Código, cliente ou telefone' : 'Buscar pedido'
  const campoBuscaPedido = (
    <div className="flex w-[17.57rem] max-w-full shrink-0 flex-col">
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
          className="h-8 w-full rounded-lg border bg-info pl-7 pr-3 text-sm shadow-sm"
          aria-label={buscaPlaceholder}
        />
      </div>
    </div>
  )

  return (
    <>
      {noFredy ? (
        <div className="flex w-[min(100%,17.57rem)] shrink-0 items-center gap-0.5">
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
        campoBuscaPedido
      )}

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
        <MenuItem value="GESTOR">{isModoDelivery ? 'Gestor Delivery' : 'Gestor'}</MenuItem>
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

      <KanbanFiltroPeriodo
        preset={periodoPreset}
        onPresetChange={onPeriodoPresetChange}
        periodoResumo={
          periodoInicio && periodoFim ? { inicio: periodoInicio, fim: periodoFim } : null
        }
      />

      {kanbanToolbarTemFiltroAtivo({
        isModoDelivery,
        searchInput,
        origemFilter,
        tipoCanalFilter,
        tipoEntregaFilter,
        terminalFilter,
        colunaKanbanFiltro,
        periodoPreset,
      }) ? (
        <button
          onClick={onClearFilters}
          className="flex h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-1 text-sm transition-colors"
          style={{ borderColor: KANBAN_BUTTON_COLOR, color: KANBAN_BUTTON_COLOR }}
        >
          <MdFilterAltOff size={16} />
          Limpar
        </button>
      ) : null}
    </>
  )
}
