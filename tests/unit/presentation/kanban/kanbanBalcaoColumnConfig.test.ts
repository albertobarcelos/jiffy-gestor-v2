import { describe, expect, it } from 'vitest'
import {
  balcaoKanbanColunasAtivas,
  buildVendasUnificadasParamsForKanbanColumn,
  vendaPertenceColunaBalcaoKanban,
} from '@/src/presentation/components/features/kanban/utils/kanbanBalcaoColumnConfig'
import type { VendaUnificadaDTO } from '@/src/presentation/components/features/kanban/hooks/useVendasUnificadas'

describe('balcaoKanbanColunasAtivas', () => {
  it('padrão / Emitidas: FINALIZADAS à esquerda + COM_FISCAL', () => {
    expect(balcaoKanbanColunasAtivas('')).toEqual(['FINALIZADAS', 'COM_FISCAL'])
    expect(balcaoKanbanColunasAtivas(null)).toEqual(['FINALIZADAS', 'COM_FISCAL'])
  })

  it('filtro pendente no meio: Finalizadas → Pendente → Com NF', () => {
    expect(balcaoKanbanColunasAtivas('PENDENTE_EMISSAO')).toEqual([
      'FINALIZADAS',
      'PENDENTE_EMISSAO',
      'COM_FISCAL',
    ])
  })

  it('filtro rejeitadas no meio: Finalizadas → Rejeitadas → Com NF', () => {
    expect(balcaoKanbanColunasAtivas('REJEITADAS')).toEqual([
      'FINALIZADAS',
      'REJEITADAS',
      'COM_FISCAL',
    ])
  })

  it('filtro Todas: todas as colunas com Rejeitadas por último', () => {
    expect(balcaoKanbanColunasAtivas('TODAS')).toEqual([
      'FINALIZADAS',
      'PENDENTE_EMISSAO',
      'COM_FISCAL',
      'REJEITADAS',
    ])
  })

  it('valor inválido/legado cai no padrão: FINALIZADAS + COM_FISCAL', () => {
    // @ts-expect-error — testando runtime com valor legado inesperado
    expect(balcaoKanbanColunasAtivas('FILTRO_INEXISTENTE')).toEqual(['FINALIZADAS', 'COM_FISCAL'])
    // @ts-expect-error — testando runtime com valor legado inesperado
    expect(balcaoKanbanColunasAtivas('status_fiscal')).toEqual(['FINALIZADAS', 'COM_FISCAL'])
  })
})

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
    const params = buildVendasUnificadasParamsForKanbanColumn('COM_FISCAL', base, {
      enviarFiltroFinalizacaoNaApi: true,
    })

    expect(params.colunaKanban).toBe('COM_FISCAL')
    expect(params.origem).toBe('PDV')
    expect(params.q).toBeUndefined()
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
    const params = buildVendasUnificadasParamsForKanbanColumn('COM_FISCAL', {
      ...base,
      tipoEntrega: 'entrega',
    })

    expect(params.tipoEntrega).toBeUndefined()
  })

  it('nunca combina colunaKanban com statusFiscal', () => {
    const comNfe = buildVendasUnificadasParamsForKanbanColumn(
      'COM_FISCAL',
      { ...base, statusFiscal: 'REJEITADA' },
      { enviarFiltroFinalizacaoNaApi: true }
    )
    const pendente = buildVendasUnificadasParamsForKanbanColumn(
      'PENDENTE_EMISSAO',
      { ...base, statusFiscal: 'EMITIDA' },
      { enviarFiltroFinalizacaoNaApi: true }
    )
    const rejeitadas = buildVendasUnificadasParamsForKanbanColumn(
      'REJEITADAS',
      { ...base, statusFiscal: 'REJEITADA' },
      { enviarFiltroFinalizacaoNaApi: true }
    )
    const finalizadas = buildVendasUnificadasParamsForKanbanColumn(
      'FINALIZADAS',
      { ...base, statusFiscal: 'EMITIDA' },
      { enviarFiltroFinalizacaoNaApi: true }
    )

    expect(comNfe.statusFiscal).toBeUndefined()
    expect(pendente.statusFiscal).toBeUndefined()
    expect(rejeitadas.statusFiscal).toBeUndefined()
    expect(finalizadas.statusFiscal).toBeUndefined()
    expect(rejeitadas.colunaKanban).toBe('REJEITADAS')
  })

  it('não envia q na API das colunas balcão (filtro client-side)', () => {
    const params = buildVendasUnificadasParamsForKanbanColumn('FINALIZADAS', {
      ...base,
      q: '1196',
    })

    expect(params.q).toBeUndefined()
  })
})

describe('vendaPertenceColunaBalcaoKanban', () => {
  const venda = {} as VendaUnificadaDTO

  it('em FINALIZADAS exclui COM_FISCAL, PENDENTE_EMISSAO e REJEITADAS', () => {
    expect(
      vendaPertenceColunaBalcaoKanban(venda, 'FINALIZADAS', () => 'COM_FISCAL')
    ).toBe(false)
    expect(
      vendaPertenceColunaBalcaoKanban(venda, 'FINALIZADAS', () => 'PENDENTE_EMISSAO')
    ).toBe(false)
    expect(
      vendaPertenceColunaBalcaoKanban(venda, 'FINALIZADAS', () => 'REJEITADAS')
    ).toBe(false)
    expect(
      vendaPertenceColunaBalcaoKanban(venda, 'FINALIZADAS', () => 'FINALIZADAS')
    ).toBe(true)
  })

  it('em FINALIZADAS mantém etapa fora do balcão (não esvazia a coluna)', () => {
    expect(
      vendaPertenceColunaBalcaoKanban(venda, 'FINALIZADAS', () => 'NOVOS_PEDIDOS')
    ).toBe(true)
    expect(
      vendaPertenceColunaBalcaoKanban(venda, 'FINALIZADAS', () => 'ABERTA')
    ).toBe(true)
  })

  it('nas demais colunas exige etapa exatamente igual', () => {
    expect(
      vendaPertenceColunaBalcaoKanban(venda, 'COM_FISCAL', () => 'COM_FISCAL')
    ).toBe(true)
    expect(
      vendaPertenceColunaBalcaoKanban(venda, 'REJEITADAS', () => 'REJEITADAS')
    ).toBe(true)
    expect(
      vendaPertenceColunaBalcaoKanban(venda, 'COM_FISCAL', () => 'FINALIZADAS')
    ).toBe(false)
  })
})
