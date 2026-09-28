'use client'

import { MdFilterAltOff, MdFilterList } from 'react-icons/md'
import { useKanbanToolbarQuebra } from '../hooks/useKanbanToolbarQuebra'
import { montarChaveConteudoToolbar } from '../utils/montarChaveConteudoToolbar'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type {
  ColunaKanbanFiltroExtra,
  ColunaKanbanId,
  KanbanColumn,
  OrigemFiltro,
  TipoCanalFiltro,
  TipoEntregaFiltro,
} from '../types'
import type { ModoVisualizacaoKanban } from '../utils/kanbanModoVisualizacao'
import type { KanbanFiltroDataPreset } from '../utils/kanbanFiltroDataPresets'
import type { SuperficieQuadroPedidos } from '@/src/presentation/gestor-pedidos/superficieQuadroPedidos'
import { KanbanToolbarAcoesOperacao } from './KanbanToolbarAcoesOperacao'
import { KanbanToolbarAcoesPrincipais } from './KanbanToolbarAcoesPrincipais'
import { KanbanToolbarFiltros } from './KanbanToolbarFiltros'
import { KANBAN_BUTTON_COLOR } from './kanbanToolbarTheme'

export interface KanbanToolbarProps {
  searchInput: string
  onSearchInputChange: (value: string) => void
  onRefresh: () => void | Promise<void>
  filtrosVisiveisMobile: boolean
  onToggleFiltrosMobile: () => void
  origemFilter: OrigemFiltro
  onOrigemFilterChange: (value: OrigemFiltro) => void
  tipoCanalFilter: TipoCanalFiltro
  onTipoCanalFilterChange: (value: TipoCanalFiltro) => void
  tipoEntregaFilter: TipoEntregaFiltro
  onTipoEntregaFilterChange: (value: TipoEntregaFiltro) => void
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

export function KanbanToolbar(props: KanbanToolbarProps) {
  const colunaKanbanFiltro = props.colunaKanbanFiltro ?? ''
  const onColunaKanbanFiltro = props.onColunaKanbanFiltroChange ?? (() => undefined)
  const isModoDelivery = props.modoKanbanVendas === 'delivery'
  const noFredy = props.superficie === 'fredy'
  const { containerRef, filtrosRef, acoesCimaRef, acoesBaixoRef, quebra } =
    useKanbanToolbarQuebra(
      montarChaveConteudoToolbar({
        periodoPreset: props.periodoPreset,
        periodoInicioMs: props.periodoInicio?.getTime() ?? '',
        periodoFimMs: props.periodoFim?.getTime() ?? '',
        origem: props.origemFilter,
        tipoEntrega: props.tipoEntregaFilter,
        tipoCanal: props.tipoCanalFilter,
        terminal: props.terminalFilter,
        coluna: colunaKanbanFiltro,
        modo: props.modoKanbanVendas,
      })
    )

  return (
    <div className="bg-primary-background mt-2 flex-shrink-0 rounded-b-lg rounded-t-lg pb-0">
      <div className="flex justify-end py-2 sm:hidden">
        <button
          type="button"
          onClick={props.onToggleFiltrosMobile}
          className="flex items-center gap-2 rounded-md px-3 py-1 text-sm text-white shadow-sm"
          style={{ backgroundColor: KANBAN_BUTTON_COLOR }}
          aria-expanded={props.filtrosVisiveisMobile}
        >
          {props.filtrosVisiveisMobile ? <MdFilterAltOff size={18} /> : <MdFilterList size={18} />}
          <span>{props.filtrosVisiveisMobile ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
        </button>
      </div>

      <div
        ref={containerRef}
        className={`min-w-0 rounded-t-lg bg-custom-2 px-1 py-1.5 ${
          props.filtrosVisiveisMobile ? 'flex' : 'hidden sm:flex'
        } flex-row flex-nowrap items-center gap-1.5`}
      >
        <div
          ref={filtrosRef}
          className={`flex items-center gap-1 ${
            quebra ? 'min-w-0 flex-1 flex-wrap' : 'shrink-0 flex-nowrap'
          }`}
        >
          <KanbanToolbarFiltros
            isModoDelivery={isModoDelivery}
            noFredy={noFredy}
            searchInput={props.searchInput}
            onSearchInputChange={props.onSearchInputChange}
            onRefresh={props.onRefresh}
            origemFilter={props.origemFilter}
            onOrigemFilterChange={props.onOrigemFilterChange}
            tipoCanalFilter={props.tipoCanalFilter}
            onTipoCanalFilterChange={props.onTipoCanalFilterChange}
            tipoEntregaFilter={props.tipoEntregaFilter}
            onTipoEntregaFilterChange={props.onTipoEntregaFilterChange}
            colunaKanbanFiltro={colunaKanbanFiltro}
            onColunaKanbanFiltro={onColunaKanbanFiltro}
            terminalFilter={props.terminalFilter}
            onTerminalFilterChange={props.onTerminalFilterChange}
            terminais={props.terminais}
            isLoadingTerminais={props.isLoadingTerminais}
            origemFilterDisabled={props.origemFilterDisabled ?? false}
            tipoCanalFilterDisabled={props.tipoCanalFilterDisabled ?? false}
            periodoPreset={props.periodoPreset}
            onPeriodoPresetChange={props.onPeriodoPresetChange}
            periodoInicio={props.periodoInicio}
            periodoFim={props.periodoFim}
            onClearFilters={props.onClearFilters}
            modoKanbanVendas={props.modoKanbanVendas}
            colunasDoModo={props.colunasDoModo}
            colunasOcultas={props.colunasOcultas}
            onSetColunaVisivel={props.onSetColunaVisivel}
            contagemPorColuna={props.contagemPorColuna}
          />
        </div>
        <div
          className={
            quebra
              ? 'ml-auto flex shrink-0 flex-col items-end justify-center gap-1'
              : 'contents'
          }
        >
          <div
            ref={acoesCimaRef}
            className={`flex shrink-0 items-center justify-end gap-1 ${
              quebra ? '' : 'order-3'
            }`}
          >
            <KanbanToolbarAcoesPrincipais
              isModoDelivery={isModoDelivery}
              onAbrirConfiguracoesDelivery={props.onAbrirConfiguracoesDelivery}
              onAbrirNovoPedido={props.onAbrirNovoPedido}
            />
          </div>
          <div
            ref={acoesBaixoRef}
            className={`flex shrink-0 items-center justify-end gap-1 ${
              quebra ? '' : 'order-2 ml-auto'
            }`}
          >
            <KanbanToolbarAcoesOperacao
              noFredy={noFredy}
              onRefresh={props.onRefresh}
              onAbrirCaixaEstacao={props.onAbrirCaixaEstacao}
              caixaAberta={props.caixaAberta}
              modoKanbanVendas={props.modoKanbanVendas}
              onModoKanbanVendasChange={props.onModoKanbanVendasChange}
              modoVisualizacao={props.modoVisualizacao}
              onModoVisualizacaoChange={props.onModoVisualizacaoChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
