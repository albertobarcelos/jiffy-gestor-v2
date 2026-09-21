import { describe, expect, it } from 'vitest'
import {
  DELIVERY_KANBAN_COLUMN_IDS,
  FILTRO_STATUS_ENTREGUES_PADRAO,
  buildPedidosDeliveryParamsForKanbanColumn,
  vendaAtendeFiltroStatusEntregues,
  vendaPertenceColunaDeliveryKanban,
} from '@/src/presentation/components/features/kanban/utils/kanbanDeliveryColumnConfig'
import type { VendaUnificadaDTO } from '@/src/presentation/components/features/kanban/hooks/useVendasUnificadas'

function vendaComStatus(
  statusFiscal: string | null,
  extras: Partial<VendaUnificadaDTO> = {}
): VendaUnificadaDTO {
  return { statusFiscal, ...extras } as VendaUnificadaDTO
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

  it('Entregues inclui pedido delivery cancelado', () => {
    const cancelado = {
      tabelaOrigem: 'venda_gestor',
      tipoVenda: 'delivery',
      statusEtapaOperacional: 'CANCELADO',
      dataCancelamento: '2026-09-17T12:00:00.000Z',
    } as VendaUnificadaDTO
    expect(
      vendaPertenceColunaDeliveryKanban(cancelado, 'FINALIZADAS', () => 'ABERTA')
    ).toBe(true)
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
        vendaComStatus('EMITIDA'),
        'EMITIDA',
        () => 'FINALIZADAS'
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

  it('EMITIDA e dataEmissaoFiscal entram no filtro Emitida', () => {
    expect(
      vendaAtendeFiltroStatusEntregues(
        vendaComStatus('EMITIDA'),
        'EMITIDA',
        () => 'COM_FISCAL'
      )
    ).toBe(true)
    expect(
      vendaAtendeFiltroStatusEntregues(
        vendaComStatus(null, { dataEmissaoFiscal: '2026-09-17T18:00:00.000Z' }),
        'EMITIDA',
        () => 'COM_FISCAL'
      )
    ).toBe(true)
    expect(
      vendaAtendeFiltroStatusEntregues(
        vendaComStatus('PENDENTE'),
        'EMITIDA',
        () => 'COM_FISCAL'
      )
    ).toBe(false)
  })

  it('CANCELADA separa nota cancelada e pedido cancelado', () => {
    expect(
      vendaAtendeFiltroStatusEntregues(
        vendaComStatus('CANCELADA'),
        'CANCELADA',
        () => 'COM_FISCAL'
      )
    ).toBe(true)
    expect(
      vendaAtendeFiltroStatusEntregues(
        vendaComStatus('CANCELADA'),
        'EMITIDA',
        () => 'COM_FISCAL'
      )
    ).toBe(false)
    expect(
      vendaAtendeFiltroStatusEntregues(
        vendaComStatus(null, {
          dataCancelamento: '2026-09-17T12:00:00.000Z',
          tabelaOrigem: 'venda_gestor',
          tipoVenda: 'delivery',
          statusEtapaOperacional: 'CANCELADO',
        }),
        'CANCELADA',
        () => 'ABERTA'
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

describe('buildPedidosDeliveryParamsForKanbanColumn — Entregues', () => {
  it('busca FINALIZADO e CANCELADO pelo último movimento do período, sem excluir cancelados', () => {
    const params = buildPedidosDeliveryParamsForKanbanColumn(
      'FINALIZADAS',
      {
        dataCriacaoInicial: '2026-09-17T03:00:00.000Z',
        dataCriacaoFinal: '2026-09-18T02:59:59.999Z',
        dataFinalizacaoInicio: '2026-09-17T03:00:00.000Z',
        dataFinalizacaoFim: '2026-09-18T02:59:59.999Z',
      },
      { enviarFiltroFinalizacaoNaApi: true }
    )

    expect(params.statusDelivery).toEqual(['FINALIZADO', 'CANCELADO'])
    expect(params.cancelado).toBeNull()
    expect(params.dataFinalizacaoInicio).toBeUndefined()
    expect(params.dataUltimaModificacaoInicial).toBe('2026-09-17T03:00:00.000Z')
  })
})
