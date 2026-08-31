import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type {
  ColunaKanbanFiltroExtra,
  ColunaKanbanId,
  OrigemFiltro,
  TipoEntregaFiltro,
} from '../types'
import {
  colunasOcultasPadraoDoModo,
  sanitizarColunasOcultas,
} from '../utils/kanbanColunasVisibilidade'
import type { KanbanFiltroDataPreset } from '../utils/kanbanFiltroDataPresets'
import {
  parseModoVisualizacaoKanban,
  type ModoVisualizacaoKanban,
} from '../utils/kanbanModoVisualizacao'

export const KANBAN_PRIMEIRO_POR_COLUNA_KEY = 'jiffy-gestor-v2:kanban-primeiro-por-coluna'
export const KANBAN_MODO_VENDAS_STORAGE_KEY = 'jiffy-gestor-v2:kanban-modo-vendas'
export const KANBAN_MODO_VISUALIZACAO_STORAGE_KEY = 'jiffy-gestor-v2:kanban-modo-visualizacao'
export const KANBAN_FILTRO_COLUNA_STORAGE_KEY = 'jiffy-gestor-v2:kanban-filtro-coluna'
export const KANBAN_COLUNAS_OCULTAS_STORAGE_KEY = 'jiffy-gestor-v2:kanban-colunas-ocultas'
/** Filtros da barra (busca, período, tipo). Independentes do modo Quadro/Operação/Lista. */
export const KANBAN_FILTROS_TOOLBAR_STORAGE_KEY = 'jiffy-gestor-v2:kanban-filtros-toolbar'

export type FiltroDataKanbanModoStorage = 'periodo' | 'todos'

export type SnapshotFiltrosToolbarKanban = {
  searchInput: string
  origemFilter: OrigemFiltro
  tipoEntregaFilter: TipoEntregaFiltro
  periodoPreset: KanbanFiltroDataPreset
  periodoDataModo: FiltroDataKanbanModoStorage
  periodoInicioISO: string | null
  periodoFimISO: string | null
}

const ORIGENS_FILTRO: readonly OrigemFiltro[] = ['', 'PDV', 'GESTOR', 'DELIVERY']
const TIPOS_ENTREGA_FILTRO: readonly TipoEntregaFiltro[] = ['', 'entrega', 'retirada']
const PRESETS_PERIODO: readonly KanbanFiltroDataPreset[] = [
  'hoje',
  'ontem',
  'ultimos_7',
  'todos',
  'por_data',
]

export function snapshotFiltrosToolbarKanbanPadrao(): SnapshotFiltrosToolbarKanban {
  return {
    searchInput: '',
    origemFilter: '',
    tipoEntregaFilter: '',
    periodoPreset: 'hoje',
    periodoDataModo: 'periodo',
    periodoInicioISO: null,
    periodoFimISO: null,
  }
}

function isOrigemFiltro(value: unknown): value is OrigemFiltro {
  return typeof value === 'string' && (ORIGENS_FILTRO as readonly string[]).includes(value)
}

function isTipoEntregaFiltro(value: unknown): value is TipoEntregaFiltro {
  return typeof value === 'string' && (TIPOS_ENTREGA_FILTRO as readonly string[]).includes(value)
}

function isPresetPeriodo(value: unknown): value is KanbanFiltroDataPreset {
  return typeof value === 'string' && (PRESETS_PERIODO as readonly string[]).includes(value)
}

function isoOuNulo(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') return null
  const t = Date.parse(value)
  return Number.isFinite(t) ? value : null
}

export function sanitizarSnapshotFiltrosToolbarKanban(
  raw: unknown
): SnapshotFiltrosToolbarKanban {
  const padrao = snapshotFiltrosToolbarKanbanPadrao()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return padrao
  const o = raw as Record<string, unknown>
  const periodoPreset = isPresetPeriodo(o.periodoPreset) ? o.periodoPreset : padrao.periodoPreset
  const periodoDataModo: FiltroDataKanbanModoStorage =
    o.periodoDataModo === 'todos' || periodoPreset === 'todos' ? 'todos' : 'periodo'
  const presetComDatas = periodoPreset === 'por_data' || periodoPreset === 'ultimos_7'
  return {
    searchInput: typeof o.searchInput === 'string' ? o.searchInput : '',
    origemFilter: isOrigemFiltro(o.origemFilter) ? o.origemFilter : '',
    tipoEntregaFilter: isTipoEntregaFiltro(o.tipoEntregaFilter) ? o.tipoEntregaFilter : '',
    periodoPreset,
    periodoDataModo,
    periodoInicioISO: presetComDatas ? isoOuNulo(o.periodoInicioISO) : null,
    periodoFimISO: presetComDatas ? isoOuNulo(o.periodoFimISO) : null,
  }
}

/** «Pedidos do cliente» no WhatsApp sobrepõe busca/período; o resto da barra mantém-se. */
export function mesclarPendenciaFiltrosToolbarKanban(
  base: SnapshotFiltrosToolbarKanban,
  pendencia: { busca: string; periodoTodos: boolean }
): SnapshotFiltrosToolbarKanban {
  return {
    ...base,
    searchInput: pendencia.busca || base.searchInput,
    ...(pendencia.periodoTodos
      ? {
          periodoPreset: 'todos' as const,
          periodoDataModo: 'todos' as const,
          periodoInicioISO: null,
          periodoFimISO: null,
        }
      : {}),
  }
}

export function lerFiltrosToolbarKanbanDoStorage(): SnapshotFiltrosToolbarKanban {
  if (typeof window === 'undefined') return snapshotFiltrosToolbarKanbanPadrao()
  try {
    const raw = sessionStorage.getItem(KANBAN_FILTROS_TOOLBAR_STORAGE_KEY)
    if (!raw) return snapshotFiltrosToolbarKanbanPadrao()
    return sanitizarSnapshotFiltrosToolbarKanban(JSON.parse(raw) as unknown)
  } catch {
    return snapshotFiltrosToolbarKanbanPadrao()
  }
}

export function gravarFiltrosToolbarKanbanNoStorage(snapshot: SnapshotFiltrosToolbarKanban) {
  try {
    sessionStorage.setItem(
      KANBAN_FILTROS_TOOLBAR_STORAGE_KEY,
      JSON.stringify(sanitizarSnapshotFiltrosToolbarKanban(snapshot))
    )
  } catch {
    /* quota / modo privado */
  }
}

const FILTROS_COLUNA_VALIDOS: readonly ColunaKanbanFiltroExtra[] = [
  '',
  'PENDENTE_EMISSAO',
  'REJEITADAS',
  'TODAS',
]

export function lerModoKanbanVendasDoStorage(): ModoKanbanVendas {
  if (typeof window === 'undefined') return 'delivery'
  try {
    const raw = localStorage.getItem(KANBAN_MODO_VENDAS_STORAGE_KEY)
    if (raw === 'balcao' || raw === 'delivery') return raw
  } catch {
    /* storage indisponível */
  }
  return 'delivery'
}

export function lerModoVisualizacaoKanbanDoStorage(): ModoVisualizacaoKanban {
  if (typeof window === 'undefined') return 'quadro'
  try {
    return parseModoVisualizacaoKanban(localStorage.getItem(KANBAN_MODO_VISUALIZACAO_STORAGE_KEY))
  } catch {
    return 'quadro'
  }
}

/** Preferência do filtro Emitidas/Pendentes/Rejeitadas/Todas (default: TODAS). */
export function lerFiltroColunaKanbanDoStorage(): ColunaKanbanFiltroExtra {
  if (typeof window === 'undefined') return 'TODAS'
  try {
    const raw = localStorage.getItem(KANBAN_FILTRO_COLUNA_STORAGE_KEY)
    if (raw != null && (FILTROS_COLUNA_VALIDOS as readonly string[]).includes(raw)) {
      return raw as ColunaKanbanFiltroExtra
    }
  } catch {
    /* storage indisponível */
  }
  return 'TODAS'
}

export function gravarFiltroColunaKanbanNoStorage(filtro: ColunaKanbanFiltroExtra) {
  try {
    window.localStorage.setItem(KANBAN_FILTRO_COLUNA_STORAGE_KEY, filtro)
  } catch {
    /* quota, modo privado, etc. */
  }
}

/** Lê mapa colunaId → vendaId que deve aparecer primeiro (localStorage). */
export function lerPrimeiroPorColunaDoStorage(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KANBAN_PRIMEIRO_POR_COLUNA_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
  } catch {
    /* formato inválido ou storage indisponível */
  }
  return {}
}

type MapaColunasOcultas = Partial<Record<ModoKanbanVendas, ColunaKanbanId[]>>

function lerMapaColunasOcultas(): MapaColunasOcultas | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KANBAN_COLUNAS_OCULTAS_STORAGE_KEY)
    if (raw == null) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as MapaColunasOcultas
  } catch {
    return null
  }
}

/** Sem chave do modo no storage: delivery esconde Novos + Com NF; balcão mostra todas. */
export function lerColunasOcultasDoStorage(modo: ModoKanbanVendas): ColunaKanbanId[] {
  const mapa = lerMapaColunasOcultas()
  if (mapa == null || !(modo in mapa)) {
    return colunasOcultasPadraoDoModo(modo)
  }
  return sanitizarColunasOcultas(mapa[modo])
}

export function gravarColunasOcultasNoStorage(
  modo: ModoKanbanVendas,
  ocultas: readonly ColunaKanbanId[]
) {
  try {
    const atual = lerMapaColunasOcultas() ?? {}
    window.localStorage.setItem(
      KANBAN_COLUNAS_OCULTAS_STORAGE_KEY,
      JSON.stringify({
        ...atual,
        [modo]: sanitizarColunasOcultas(ocultas),
      })
    )
  } catch {
    /* quota, modo privado, etc. */
  }
}

export function gravarPrimeiroPorColunaNoStorage(map: Record<string, string>) {
  try {
    window.localStorage.setItem(KANBAN_PRIMEIRO_POR_COLUNA_KEY, JSON.stringify(map))
  } catch {
    /* quota, modo privado, etc. */
  }
}
