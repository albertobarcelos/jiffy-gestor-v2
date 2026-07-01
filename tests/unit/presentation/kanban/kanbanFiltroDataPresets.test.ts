import { describe, expect, it } from 'vitest'
import {
  intervaloPresetKanbanFiltroData,
  KANBAN_FILTRO_DATA_PRESET_OPCOES,
} from '@/src/presentation/components/features/kanban/utils/kanbanFiltroDataPresets'

describe('kanbanFiltroDataPresets', () => {
  it('expõe as cinco opções do dropdown', () => {
    expect(KANBAN_FILTRO_DATA_PRESET_OPCOES.map(o => o.value)).toEqual([
      'hoje',
      'ontem',
      'ultimos_7',
      'todos',
      'por_data',
    ])
  })

  it('calcula intervalo de hoje no fuso da empresa', () => {
    const intervalo = intervaloPresetKanbanFiltroData('hoje', 'America/Sao_Paulo')
    expect(intervalo).not.toBeNull()
    expect(intervalo!.inicio.getTime()).toBeLessThanOrEqual(intervalo!.fim.getTime())
  })

  it('calcula últimos 7 dias com início anterior ao fim', () => {
    const intervalo = intervaloPresetKanbanFiltroData('ultimos_7', 'America/Sao_Paulo')
    expect(intervalo).not.toBeNull()
    expect(intervalo!.inicio.getTime()).toBeLessThan(intervalo!.fim.getTime())
    const diffDias = (intervalo!.fim.getTime() - intervalo!.inicio.getTime()) / 86_400_000
    expect(diffDias).toBeGreaterThanOrEqual(6)
    expect(diffDias).toBeLessThanOrEqual(7)
  })
})
