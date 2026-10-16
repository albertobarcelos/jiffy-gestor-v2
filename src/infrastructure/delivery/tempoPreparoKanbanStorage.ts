import {
  EVENTO_TEMPO_PREPARO_ATUALIZADO,
  TEMPO_PREPARO_KANBAN_MAX,
  TEMPO_PREPARO_KANBAN_MIN,
  TEMPO_PREPARO_KANBAN_PADRAO_MIN,
} from '@/src/shared/constants/tempoPreparoKanban'

function chave(empresaId: string): string {
  return `jiffy-tempo-preparo-minutos:${empresaId}`
}

export function clampTempoPreparoKanbanMinutos(n: number): number {
  if (!Number.isFinite(n)) return TEMPO_PREPARO_KANBAN_PADRAO_MIN
  return Math.min(
    TEMPO_PREPARO_KANBAN_MAX,
    Math.max(TEMPO_PREPARO_KANBAN_MIN, Math.floor(n))
  )
}

export function lerTempoPreparoKanbanMinutos(empresaId: string | null | undefined): number {
  if (typeof window === 'undefined') return TEMPO_PREPARO_KANBAN_PADRAO_MIN
  const id = empresaId?.trim()
  if (!id) return TEMPO_PREPARO_KANBAN_PADRAO_MIN
  try {
    const raw = window.localStorage.getItem(chave(id))
    if (!raw) return TEMPO_PREPARO_KANBAN_PADRAO_MIN
    return clampTempoPreparoKanbanMinutos(Number(raw))
  } catch {
    return TEMPO_PREPARO_KANBAN_PADRAO_MIN
  }
}

export function gravarTempoPreparoKanbanMinutos(
  empresaId: string | null | undefined,
  minutos: number
): void {
  if (typeof window === 'undefined') return
  const id = empresaId?.trim()
  if (!id) return
  try {
    window.localStorage.setItem(chave(id), String(clampTempoPreparoKanbanMinutos(minutos)))
    window.dispatchEvent(new Event(EVENTO_TEMPO_PREPARO_ATUALIZADO))
  } catch {
    /* storage indisponível */
  }
}
