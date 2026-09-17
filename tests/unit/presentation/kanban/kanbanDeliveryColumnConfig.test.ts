import { describe, expect, it } from 'vitest'
import {
  DELIVERY_KANBAN_COLUMN_IDS,
  FILTRO_STATUS_ENTREGUES_PADRAO,
  vendaAtendeFiltroStatusEntregues,
  vendaPertenceColunaDeliveryKanban,
} from '@/src/presentation/components/features/kanban/utils/kanbanDeliveryColumnConfig'
import type { VendaUnificadaDTO } from '@/src/presentation/components/features/kanban/hooks/useVendasUnificadas'

function vendaComStatus(statusFiscal: string | null): VendaUnificadaDTO {
  return { statusFiscal } as VendaUnificadaDTO
}

describe('vendaPertenceColunaDeliveryKanban', () => {
  const venda = {} as VendaUnificadaDTO

  it('em FINALIZADAS (Entregues) inclui finalizada, emitida, pendente e rejeitada', () => {
    expect(
      vendaPertenceColunaDeliveryKanban(venda, 'FINALIZADAS', () => 'FINALIZADAS')
    ).toBe(true)
    expect(
      vendaPertenceColunaDeliveryKanban(venda, 'FINALIZADAS', () => 'PENDENTE_EMISSAO')
    ).toBe(true)
    expect(
      vendaPertenceColunaDeliveryKanban(venda, 'FINALIZADAS', () => 'COM_FISCAL')
    ).toBe(true)
    expect(
      vendaPertenceColunaDeliveryKanban(venda, 'FINALIZADAS', () => 'REJEITADAS')
    ).toBe(true)
    expect(
      vendaPertenceColunaDeliveryKanban(venda, 'FINALIZADAS', () => 'EM_ROTA')
    ).toBe(false)
  })
})

describe('vendaAtendeFiltroStatusEntregues', () => {
  it('padrão do cabeçalho é Todas', () => {
    expect(FILTRO_STATUS_ENTREGUES_PADRAO).toBe('TODAS')
  })

  it('FINALIZADA lista só entregues sem nota', () => {
    expect(
      vendaAtendeFiltroStatusEntregues(
        vendaComStatus(null),
        'FINALIZADA',
        () => 'FINALIZADAS'
      )
    ).toBe(true)
    expect(
      vendaAtendeFiltroStatusEntregues(
        vendaComStatus('EMITIDA'),
        'FINALIZADA',
        () => 'COM_FISCAL'
      )
    ).toBe(false)
  })

  it('EMITIDA / PENDENTE / REJEITADA separam os status fiscais', () => {
    expect(
      vendaAtendeFiltroStatusEntregues(
        vendaComStatus('EMITIDA'),
        'EMITIDA',
        () => 'COM_FISCAL'
      )
    ).toBe(true)
    expect(
      vendaAtendeFiltroStatusEntregues(
        vendaComStatus(null),
        'PENDENTE',
        () => 'PENDENTE_EMISSAO'
      )
    ).toBe(true)
    expect(
      vendaAtendeFiltroStatusEntregues(
        vendaComStatus('REJEITADA'),
        'REJEITADA',
        () => 'REJEITADAS'
      )
    ).toBe(true)
    expect(
      vendaAtendeFiltroStatusEntregues(
        vendaComStatus('EMITIDA'),
        'TODAS',
        () => 'COM_FISCAL'
      )
    ).toBe(true)
  })
})

describe('DELIVERY_KANBAN_COLUMN_IDS', () => {
  it('entrega usa uma coluna Entregues no lugar de Finalizadas + Com NF', () => {
    expect(DELIVERY_KANBAN_COLUMN_IDS).toEqual([
      'NOVOS_PEDIDOS',
      'EM_PREPARO',
      'PRONTO_ENTREGA',
      'EM_ROTA',
      'FINALIZADAS',
    ])
  })
})
