import { describe, expect, it } from 'vitest'
import { filtrarVendaDeliveryKanbanColunaPorDatasToolbar } from '@/src/presentation/components/features/kanban/utils/kanbanVendasListagem'
import type { Venda } from '@/src/presentation/components/features/kanban/types'

function vendaMock(
  dataCriacao: string,
  dataFinalizacao: string | null = null
): Venda {
  return { dataCriacao, dataFinalizacao } as Venda
}

describe('filtrarVendaDeliveryKanbanColunaPorDatasToolbar', () => {
  it('aplica filtro de criação em coluna operacional', () => {
    const params = {
      dataCriacaoInicial: '2026-06-15T00:00:00.000Z',
      dataCriacaoFinal: '2026-06-15T23:59:59.999Z',
    }
    const dentro = vendaMock('2026-06-15T12:00:00.000Z')
    const fora = vendaMock('2026-06-14T12:00:00.000Z')

    expect(
      filtrarVendaDeliveryKanbanColunaPorDatasToolbar(dentro, 'EM_PREPARO', params)
    ).toBe(true)
    expect(
      filtrarVendaDeliveryKanbanColunaPorDatasToolbar(fora, 'EM_PREPARO', params)
    ).toBe(false)
  })

  it('não aplica filtro de finalização em coluna operacional', () => {
    const params = {
      dataFinalizacaoInicio: '2026-06-15T00:00:00.000Z',
      dataFinalizacaoFim: '2026-06-15T23:59:59.999Z',
    }
    const venda = vendaMock('2026-01-01T12:00:00.000Z', '2026-01-01T12:00:00.000Z')

    expect(
      filtrarVendaDeliveryKanbanColunaPorDatasToolbar(venda, 'EM_PREPARO', params)
    ).toBe(true)
  })

  it('aplica filtro de finalização em coluna fiscal', () => {
    const params = {
      dataFinalizacaoInicio: '2026-06-15T00:00:00.000Z',
      dataFinalizacaoFim: '2026-06-15T23:59:59.999Z',
    }
    const dentro = vendaMock('2026-01-01T12:00:00.000Z', '2026-06-15T18:00:00.000Z')
    const fora = vendaMock('2026-01-01T12:00:00.000Z', '2026-06-14T18:00:00.000Z')

    expect(
      filtrarVendaDeliveryKanbanColunaPorDatasToolbar(dentro, 'FINALIZADAS', params)
    ).toBe(true)
    expect(
      filtrarVendaDeliveryKanbanColunaPorDatasToolbar(fora, 'COM_NFE', params)
    ).toBe(false)
  })
})
