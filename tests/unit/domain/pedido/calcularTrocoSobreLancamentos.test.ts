import { describe, expect, it } from 'vitest'
import {
  calcularTrocoPedido,
  calcularTrocoSobreLancamentos,
  pagamentosCobremTotalPedido,
} from '@/src/domain/services/pedido/CalculadoraPagamentoPedido'

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

  it('cobre o total com troco no dinheiro', () => {
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

    expect(domain).toBe(30)
    expect(pagamentosCobremTotalPedido(30, 60, domain)).toBe(true)
  })
})
