import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type { ColunaKanbanFiltroExtra, ColunaKanbanId } from '../types'
import {
  colunasOcultasPadraoDoModo,
  sanitizarColunasOcultas,
} from '../utils/kanbanColunasVisibilidade'
import {
  parseModoVisualizacaoKanban,
  type ModoVisualizacaoKanban,
} from '../utils/kanbanModoVisualizacao'

export const KANBAN_PRIMEIRO_POR_COLUNA_KEY = 'jiffy-gestor-v2:kanban-primeiro-por-coluna'
export const KANBAN_MODO_VENDAS_STORAGE_KEY = 'jiffy-gestor-v2:kanban-modo-vendas'
export const KANBAN_MODO_VISUALIZACAO_STORAGE_KEY = 'jiffy-gestor-v2:kanban-modo-visualizacao'
export const KANBAN_FILTRO_COLUNA_STORAGE_KEY = 'jiffy-gestor-v2:kanban-filtro-coluna'
export const KANBAN_COLUNAS_OCULTAS_STORAGE_KEY = 'jiffy-gestor-v2:kanban-colunas-ocultas'

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
