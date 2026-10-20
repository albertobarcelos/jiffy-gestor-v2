import { describe, expect, it } from 'vitest'
import {
  combinarContagensColunasDeliveryKanban,
  derivarContagensColunasFiscaisKanban,
  mapContagemOperacionalFromListagemColunas,
  mapContagemOperacionalParaColunas,
} from '@/src/presentation/components/features/kanban/utils/kanbanDeliveryColumnCounts'
import { VendaUnificadaDTO } from '@/src/presentation/components/features/kanban/hooks/useVendasUnificadas'

const contagemOperacional = {
  PENDENTE: 5,
  EM_PREPARO: 3,
  PRONTO: 2,
  EM_ROTA: 1,
  FINALIZADO: 0,
  CANCELADO: 0,
  total: 11,
}

function vendaMock(etapa: string): VendaUnificadaDTO {
  return {
    getEtapaKanban: () => etapa,
  } as VendaUnificadaDTO
}

describe('mapContagemOperacionalParaColunas', () => {
  it('mapeia status delivery para ids de coluna operacional', () => {
    expect(mapContagemOperacionalParaColunas(contagemOperacional)).toEqual({
      NOVOS_PEDIDOS: 5,
      EM_PREPARO: 3,
      PRONTO_ENTREGA: 2,
      EM_ROTA: 1,
    })
  })
})

describe('derivarContagensColunasFiscaisKanban', () => {
  const getEtapa = (v: VendaUnificadaDTO) => v.getEtapaKanban()

  it('sem próxima página conta o pool inteiro na coluna Entregues', () => {
    const pool = [
      vendaMock('FINALIZADAS'),
      vendaMock('PENDENTE_EMISSAO'),
      vendaMock('COM_FISCAL'),
      vendaMock('REJEITADAS'),
    ]

    expect(
      derivarContagensColunasFiscaisKanban(10, pool, getEtapa, false)
    ).toEqual({ FINALIZADAS: 4, COM_FISCAL: 0 })
  })

  it('com próxima página usa o total FINALIZADO da API na coluna Entregues', () => {
    const pool = [vendaMock('FINALIZADAS'), vendaMock('COM_FISCAL')]

    expect(
      derivarContagensColunasFiscaisKanban(100, pool, getEtapa, true)
    ).toEqual({ FINALIZADAS: 100, COM_FISCAL: 0 })
  })
})

describe('mapContagemOperacionalFromListagemColunas', () => {
  it('usa totalCount da listagem paginada por coluna', () => {
    expect(
      mapContagemOperacionalFromListagemColunas({
        NOVOS_PEDIDOS: { totalCount: 42 },
        EM_PREPARO: { totalCount: 7 },
      })
    ).toEqual({
      NOVOS_PEDIDOS: 42,
      EM_PREPARO: 7,
    })
  })
})

describe('combinarContagensColunasDeliveryKanban', () => {
  it('usa fallback da listagem quando contagem operacional ainda não chegou', () => {
    const counts = combinarContagensColunasDeliveryKanban(
      undefined,
      0,
      [],
      v => v.getEtapaKanban(),
      false,
      {
        NOVOS_PEDIDOS: { totalCount: 42 },
        EM_PREPARO: { totalCount: 7 },
      }
    )

    expect(counts).toEqual({
      NOVOS_PEDIDOS: 42,
      EM_PREPARO: 7,
      FINALIZADAS: 0,
      COM_FISCAL: 0,
    })
  })

  it('combina operacional e fiscal', () => {
    const counts = combinarContagensColunasDeliveryKanban(
      contagemOperacional,
      4,
      [vendaMock('FINALIZADAS'), vendaMock('COM_FISCAL'), vendaMock('COM_FISCAL')],
      v => v.getEtapaKanban(),
      false
    )

    expect(counts).toEqual({
      NOVOS_PEDIDOS: 5,
      EM_PREPARO: 3,
      PRONTO_ENTREGA: 2,
      EM_ROTA: 1,
      FINALIZADAS: 3,
      COM_FISCAL: 0,
    })
  })
})
