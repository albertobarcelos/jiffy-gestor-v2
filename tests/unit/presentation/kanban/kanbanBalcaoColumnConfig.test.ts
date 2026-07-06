import { describe, expect, it } from 'vitest'
import { buildVendasUnificadasParamsForKanbanColumn } from '@/src/presentation/components/features/kanban/utils/kanbanBalcaoColumnConfig'

describe('buildVendasUnificadasParamsForKanbanColumn', () => {
  const base = {
    origem: 'PDV' as const,
    q: '123',
    dataCriacaoInicial: '2026-07-01T00:00:00.000Z',
    dataCriacaoFinal: '2026-07-01T23:59:59.999Z',
    dataFinalizacaoInicio: '2026-07-01T00:00:00.000Z',
    dataFinalizacaoFim: '2026-07-01T23:59:59.999Z',
    terminalId: 'term-1',
  }

  it('adiciona colunaKanban e remove filtros de criação', () => {
    const params = buildVendasUnificadasParamsForKanbanColumn('COM_NFE', base, {
      enviarFiltroFinalizacaoNaApi: true,
    })

    expect(params.colunaKanban).toBe('COM_NFE')
    expect(params.origem).toBe('PDV')
    expect(params.q).toBe('123')
    expect(params.terminalId).toBe('term-1')
    expect(params.dataFinalizacaoInicio).toBe(base.dataFinalizacaoInicio)
    expect(params.dataFinalizacaoFim).toBe(base.dataFinalizacaoFim)
    expect(params.dataCriacaoInicial).toBeUndefined()
    expect(params.periodoInicial).toBeUndefined()
  })

  it('omite datas de finalização quando filtro desligado', () => {
    const params = buildVendasUnificadasParamsForKanbanColumn('FINALIZADAS', base, {
      enviarFiltroFinalizacaoNaApi: false,
    })

    expect(params.colunaKanban).toBe('FINALIZADAS')
    expect(params.dataFinalizacaoInicio).toBeUndefined()
    expect(params.dataFinalizacaoFim).toBeUndefined()
  })

  it('remove tipoEntrega (só delivery)', () => {
    const params = buildVendasUnificadasParamsForKanbanColumn('COM_NFE', {
      ...base,
      tipoEntrega: 'entrega',
    })

    expect(params.tipoEntrega).toBeUndefined()
  })
})
