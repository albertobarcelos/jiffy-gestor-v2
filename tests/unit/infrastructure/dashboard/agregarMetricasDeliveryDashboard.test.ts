import { describe, expect, it } from 'vitest'
import {
  acrescentarCobrancasDeliveryAoAgregado,
  agregarMetricasDeliveryDashboard,
  overlayMetricasPdvComDelivery,
} from '@/src/infrastructure/dashboard/agregarMetricasDeliveryDashboard'

describe('agregarMetricasDeliveryDashboard', () => {
  it('soma finalizados e cancelados sem misturar valores', () => {
    const metricas = agregarMetricasDeliveryDashboard([
      { statusDelivery: 'FINALIZADO', dataFinalizacao: '2026-09-25T12:00:00.000Z', valorFinal: 40 },
      { statusDelivery: 'CANCELADO', dataCancelamento: '2026-09-25T13:00:00.000Z', valorFinal: 15 },
      { statusDelivery: 'EM_ROTA', valorFinal: 99 },
    ])

    expect(metricas).toEqual({
      totalFaturado: 40,
      countFinalizadas: 1,
      countCanceladas: 1,
      totalCancelado: 15,
    })
  })

  it('acrescenta delivery no bloco PDV sem alterar produtos', () => {
    const overlay = overlayMetricasPdvComDelivery(
      {
        total: {
          totalFaturado: 100,
          countVendasEfetivadas: 2,
          countVendasCanceladas: 1,
          countProdutosVendidos: 7,
        },
        finalizadas: {
          totalFaturado: 100,
          countVendasEfetivadas: 2,
          countVendasCanceladas: 0,
          countProdutosVendidos: 7,
        },
        canceladas: {
          totalFaturado: 10,
          countVendasEfetivadas: 0,
          countVendasCanceladas: 1,
          countProdutosVendidos: 0,
        },
        totalCancelado: 10,
        mesasAbertas: 3,
      },
      { totalFaturado: 40, countFinalizadas: 1, countCanceladas: 2, totalCancelado: 20 }
    )

    expect(overlay.total.totalFaturado).toBe(140)
    expect(overlay.total.countVendasEfetivadas).toBe(3)
    expect(overlay.total.countVendasCanceladas).toBe(3)
    expect(overlay.total.countProdutosVendidos).toBe(7)
    expect(overlay.finalizadas.totalFaturado).toBe(140)
    expect(overlay.canceladas.countVendasCanceladas).toBe(3)
    expect(overlay.totalCancelado).toBe(30)
    expect(overlay.mesasAbertas).toBe(3)
  })

  it('soma cobranças pagas e desconta troco do dinheiro', () => {
    const agregado = new Map()
    const cacheMeios = new Map([
      ['din', { nome: 'Dinheiro', formaPagamentoFiscal: 'DINHEIRO' }],
      ['pix', { nome: 'PIX', formaPagamentoFiscal: 'PIX' }],
    ])

    const valor = acrescentarCobrancasDeliveryAoAgregado({
      pedidos: [
        {
          statusDelivery: 'FINALIZADO',
          dataFinalizacao: '2026-09-25T12:00:00.000Z',
          valorFinal: 50,
          cobrancas: [
            { valor: 60, meioPagamentoId: 'din', status: 'paga' },
            { valor: 10, meioPagamentoId: 'pix', status: 'pendente' },
          ],
        },
      ],
      cacheMeios,
      agregado,
    })

    expect(valor).toBe(50)
    expect(agregado.get('Dinheiro')?.valor).toBe(50)
    expect(agregado.has('PIX')).toBe(false)
  })
})
