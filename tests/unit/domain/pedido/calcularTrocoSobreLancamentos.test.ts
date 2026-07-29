import { describe, expect, it } from 'vitest'
import {
  calcularTrocoPedido,
  calcularTrocoSobreLancamentos,
  pagamentosCobremTotalPedido,
} from '@/src/domain/services/pedido/CalculadoraPagamentoPedido'
import { calcularTrocoCheckout } from '@/src/application/services/delivery-publico/checkoutPagamentos'

describe('calcularTrocoSobreLancamentos (domain)', () => {
  it('calcula troco no último dinheiro', () => {
    expect(
      calcularTrocoSobreLancamentos({
        total: 30,
        lancamentos: [
          { valor: 10, isDinheiro: false },
          { valor: 50, isDinheiro: true },
        ],
      })
    ).toBe(30)
  })

  it('é compartilhado entre gestor e checkout público', () => {
    const domain = calcularTrocoPedido({
      totalProdutos: 30,
      pagamentos: [
        { meioPagamentoId: 'pix', valor: 10 },
        { meioPagamentoId: 'dinheiro', valor: 50 },
      ],
      meiosPagamento: [
        { getId: () => 'pix', getNome: () => 'PIX' },
        { getId: () => 'dinheiro', getNome: () => 'Dinheiro' },
      ],
    })
    const publico = calcularTrocoCheckout(30, [
      { meioPagamentoId: 'pix', valor: 10 },
      { meioPagamentoId: 'dinheiro', valor: 50 },
    ], id => id === 'dinheiro')

    expect(domain).toBe(30)
    expect(publico).toBe(30)
    expect(pagamentosCobremTotalPedido(30, 60, domain)).toBe(true)
  })
})
