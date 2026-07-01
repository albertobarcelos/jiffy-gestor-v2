import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'

export const KANBAN_PRIMEIRO_POR_COLUNA_KEY = 'jiffy-gestor-v2:kanban-primeiro-por-coluna'
export const KANBAN_MODO_VENDAS_STORAGE_KEY = 'jiffy-gestor-v2:kanban-modo-vendas'

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
