import { describe, expect, it } from 'vitest'
import { intervaloDiaOperacionalKanban } from '@/src/presentation/components/features/kanban/utils/diaOperacionalKanban'
import { intervaloPresetKanbanFiltroData } from '@/src/presentation/components/features/kanban/utils/kanbanFiltroDataPresets'

const TZ = 'America/Sao_Paulo'

describe('intervaloDiaOperacionalKanban', () => {
  it('sábado 01:20 ainda é o turno de sexta em Hoje', () => {
    const agora = new Date('2026-08-22T04:20:00.000Z')
    const hoje = intervaloDiaOperacionalKanban('hoje', TZ, agora)
    expect(hoje.inicio.toISOString()).toBe('2026-08-21T03:00:00.000Z')
    expect(hoje.fim.toISOString()).toBe('2026-08-22T07:00:00.000Z')
    const pedido = agora.getTime()
    expect(pedido).toBeGreaterThanOrEqual(hoje.inicio.getTime())
    expect(pedido).toBeLessThan(hoje.fim.getTime())
  })

  it('sábado 04:01 já é o turno de sábado', () => {
    const agora = new Date('2026-08-22T07:01:00.000Z')
    const hoje = intervaloDiaOperacionalKanban('hoje', TZ, agora)
    expect(hoje.inicio.toISOString()).toBe('2026-08-22T03:00:00.000Z')
    expect(hoje.fim.toISOString()).toBe('2026-08-23T07:00:00.000Z')
  })

  it('Ontem às 01:20 de sábado é o turno de quinta', () => {
    const agora = new Date('2026-08-22T04:20:00.000Z')
    const ontem = intervaloDiaOperacionalKanban('ontem', TZ, agora)
    expect(ontem.inicio.toISOString()).toBe('2026-08-20T03:00:00.000Z')
    expect(ontem.fim.toISOString()).toBe('2026-08-21T07:00:00.000Z')
  })
})

describe('intervaloPresetKanbanFiltroData', () => {
  it('no Gestor web sábado 01:20 é o dia civil de sábado', () => {
    const agora = new Date('2026-08-22T04:20:00.000Z')
    const web = intervaloPresetKanbanFiltroData('hoje', TZ, { agora })
    expect(web).not.toBeNull()
    expect(web!.inicio.toISOString()).toBe('2026-08-22T03:00:00.000Z')
  })

  it('no Flow sábado 01:20 usa o dia operacional de sexta', () => {
    const agora = new Date('2026-08-22T04:20:00.000Z')
    const flow = intervaloPresetKanbanFiltroData('hoje', TZ, {
      diaOperacionalFlow: true,
      agora,
    })
    expect(flow!.inicio.toISOString()).toBe('2026-08-21T03:00:00.000Z')
    expect(flow!.fim.toISOString()).toBe('2026-08-22T07:00:00.000Z')
  })
})
