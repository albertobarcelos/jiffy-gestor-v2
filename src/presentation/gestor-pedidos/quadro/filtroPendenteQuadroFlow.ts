import { STORAGE_KANBAN_BUSCA_FLOW, STORAGE_KANBAN_PERIODO_FLOW } from '../constantes'

export type PendenciaQuadroFlow = {
  busca: string
  periodoTodos: boolean
}

export function gravarPendenciaQuadroFlow(busca: string, periodoTodos: boolean): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KANBAN_BUSCA_FLOW, busca)
    if (periodoTodos) {
      sessionStorage.setItem(STORAGE_KANBAN_PERIODO_FLOW, 'todos')
    } else {
      sessionStorage.removeItem(STORAGE_KANBAN_PERIODO_FLOW)
    }
  } catch {
    /* quota */
  }
}

export function lerPendenciaQuadroFlow(): PendenciaQuadroFlow {
  if (typeof sessionStorage === 'undefined') {
    return { busca: '', periodoTodos: false }
  }
  try {
    const busca = sessionStorage.getItem(STORAGE_KANBAN_BUSCA_FLOW) ?? ''
    const periodo = sessionStorage.getItem(STORAGE_KANBAN_PERIODO_FLOW)
    if (busca) sessionStorage.removeItem(STORAGE_KANBAN_BUSCA_FLOW)
    if (periodo) sessionStorage.removeItem(STORAGE_KANBAN_PERIODO_FLOW)
    return { busca, periodoTodos: periodo === 'todos' }
  } catch {
    return { busca: '', periodoTodos: false }
  }
}
