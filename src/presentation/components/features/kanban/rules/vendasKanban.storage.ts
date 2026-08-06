import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type { ColunaKanbanFiltroExtra } from '../types'

export const KANBAN_PRIMEIRO_POR_COLUNA_KEY = 'jiffy-gestor-v2:kanban-primeiro-por-coluna'
export const KANBAN_MODO_VENDAS_STORAGE_KEY = 'jiffy-gestor-v2:kanban-modo-vendas'
export const KANBAN_FILTRO_COLUNA_STORAGE_KEY = 'jiffy-gestor-v2:kanban-filtro-coluna'

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

export function gravarPrimeiroPorColunaNoStorage(map: Record<string, string>) {
  try {
    window.localStorage.setItem(KANBAN_PRIMEIRO_POR_COLUNA_KEY, JSON.stringify(map))
  } catch {
    /* quota, modo privado, etc. */
  }
}
