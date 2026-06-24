import { describe, expect, it } from 'vitest'
import {
  combinarContagensColunasDeliveryKanban,
  derivarContagensColunasFiscaisKanban,
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

  it('sem próxima página usa contagem exata do pool carregado', () => {
    const pool = [
      vendaMock('FINALIZADAS'),
      vendaMock('PENDENTE_EMISSAO'),
      vendaMock('COM_NFE'),
    ]

    expect(
      derivarContagensColunasFiscaisKanban(10, pool, getEtapa, false)
    ).toEqual({ FINALIZADAS: 2, COM_NFE: 1 })
  })

  it('com próxima página estima proporção do total FINALIZADO da API', () => {
    const pool = [vendaMock('FINALIZADAS'), vendaMock('COM_NFE')]

    expect(
      derivarContagensColunasFiscaisKanban(100, pool, getEtapa, true)
    ).toEqual({ FINALIZADAS: 50, COM_NFE: 50 })
  })
})

describe('combinarContagensColunasDeliveryKanban', () => {
  it('combina operacional e fiscal', () => {
    const counts = combinarContagensColunasDeliveryKanban(
      contagemOperacional,
      4,
      [vendaMock('FINALIZADAS'), vendaMock('COM_NFE'), vendaMock('COM_NFE')],
      v => v.getEtapaKanban(),
      false
    )

    expect(counts).toEqual({
      NOVOS_PEDIDOS: 5,
      EM_PREPARO: 3,
      PRONTO_ENTREGA: 2,
      EM_ROTA: 1,
      FINALIZADAS: 1,
      COM_NFE: 2,
    })
  })
})
