/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import {
  clampTempoPreparoKanbanMinutos,
  gravarTempoPreparoKanbanMinutos,
  lerTempoPreparoKanbanMinutos,
} from '@/src/infrastructure/delivery/tempoPreparoKanbanStorage'
import { TEMPO_PREPARO_KANBAN_PADRAO_MIN } from '@/src/shared/constants/tempoPreparoKanban'

describe('tempoPreparoKanbanStorage', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('limita o SLA entre 5 e 180 minutos', () => {
    expect(clampTempoPreparoKanbanMinutos(2)).toBe(5)
    expect(clampTempoPreparoKanbanMinutos(45.8)).toBe(45)
    expect(clampTempoPreparoKanbanMinutos(999)).toBe(180)
    expect(clampTempoPreparoKanbanMinutos(Number.NaN)).toBe(TEMPO_PREPARO_KANBAN_PADRAO_MIN)
  })

  it('persiste e lê o SLA por empresa', () => {
    expect(lerTempoPreparoKanbanMinutos('emp-1')).toBe(TEMPO_PREPARO_KANBAN_PADRAO_MIN)
    gravarTempoPreparoKanbanMinutos('emp-1', 15)
    expect(lerTempoPreparoKanbanMinutos('emp-1')).toBe(15)
    expect(lerTempoPreparoKanbanMinutos('emp-2')).toBe(TEMPO_PREPARO_KANBAN_PADRAO_MIN)
  })
})
