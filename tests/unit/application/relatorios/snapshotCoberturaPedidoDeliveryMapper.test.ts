import { describe, expect, it } from 'vitest'
import { mapearSnapshotCoberturaPedidoDelivery } from '@/src/application/mappers/SnapshotCoberturaPedidoDeliveryMapper'

describe('mapearSnapshotCoberturaPedidoDelivery', () => {
  it('lê taxaLancadaEntrega da taxa de entrega ativa', () => {
    const snap = mapearSnapshotCoberturaPedidoDelivery({
      taxasLancadas: [
        {
          tipo: 'entrega',
          taxaLancadaEntrega: {
            deliveryAreaEntregaId: 'area-1',
            deliveryRaioEntregaId: null,
            valorCalculadoSistema: 12,
          },
        },
      ],
    })
    expect(snap).toEqual({
      areaId: 'area-1',
      raioId: null,
      valorCalculadoSistema: 12,
    })
  })

  it('usa taxaEntrega da raiz quando não há snapshot de área', () => {
    const snap = mapearSnapshotCoberturaPedidoDelivery({
      taxaEntrega: 8,
      taxasLancadas: [],
    })
    expect(snap).toEqual({
      areaId: null,
      raioId: null,
      valorCalculadoSistema: 8,
    })
  })

  it('ignora taxa removida', () => {
    const snap = mapearSnapshotCoberturaPedidoDelivery({
      taxasLancadas: [
        {
          tipo: 'entrega',
          dataRemocao: '2026-09-01T00:00:00.000Z',
          taxaLancadaEntrega: {
            deliveryAreaEntregaId: 'area-1',
            valorCalculadoSistema: 12,
          },
        },
      ],
    })
    expect(snap).toBeNull()
  })
})
