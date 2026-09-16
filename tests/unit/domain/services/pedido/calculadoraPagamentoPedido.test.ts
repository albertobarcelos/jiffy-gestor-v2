import { describe, expect, it } from 'vitest'
import {
  calcularTrocoPedido,
  calcularTrocoSobreLancamentos,
  calcularValorAPagar,
  resolverLancamentoPagamento,
  resolverStatusPagamentoExibicaoPedido,
  totalPagamentosLancados,
  usarTrocoLancamentoPedido,
} from '@/src/domain/services/pedido/CalculadoraPagamentoPedido'

describe('cálculo de lançamento misto', () => {
  it('ao clicar no PIX depois de R$ 10 na entrega, lança só o que falta', () => {
    const resultado = resolverLancamentoPagamento({
      totalPedido: 25,
      pagamentosJaLancados: [
        {
          meioPagamentoId: 'mp-dinheiro',
          valor: 10,
          cobrarNaEntrega: true,
          naoEfetivo: true,
        },
      ],
      valorDigitado: null,
      isDinheiro: false,
    })

    expect(resultado).toEqual({ ok: true, valor: 15 })
  })

  it('desconta o que já foi lançado na entrega do saldo da aba Já foi pago', () => {
    const lancados = totalPagamentosLancados([
      { meioPagamentoId: 'mp-dinheiro', valor: 10, cobrarNaEntrega: true, naoEfetivo: true },
    ])

    expect(calcularValorAPagar(45, lancados)).toBe(35)
  })

  it('não marca Pago enquanto existir cobrança na entrega', () => {
    expect(
      resolverStatusPagamentoExibicaoPedido(
        [
          { meioPagamentoId: 'mp-credito', valor: 35 },
          {
            meioPagamentoId: 'mp-dinheiro',
            valor: 10,
            cobrarNaEntrega: true,
            naoEfetivo: true,
          },
        ],
        35,
        10
      )
    ).toBe('parcial')
  })

  it('não gera troco se o pedido já estava coberto antes do dinheiro', () => {
    expect(
      calcularTrocoSobreLancamentos({
        total: 45,
        lancamentos: [
          { valor: 45, isDinheiro: false },
          { valor: 10, isDinheiro: true },
        ],
      })
    ).toBe(0)
  })

  it('calcula troco da cédula na entrega com o mesmo núcleo da aba Pagamento', () => {
    expect(
      calcularTrocoPedido({
        totalProdutos: 39.9,
        pagamentos: [
          {
            meioPagamentoId: 'mp-dinheiro',
            valor: 50,
            cobrarNaEntrega: true,
            naoEfetivo: true,
          },
        ],
        nomesMeiosPagamentoPorId: { 'mp-dinheiro': 'Dinheiro' },
        considerarApenasNaoCancelados: true,
      })
    ).toBeCloseTo(10.1)
  })

  it('nao gera troco para PIX nomeado acima do total', () => {
    expect(
      calcularTrocoPedido({
        totalProdutos: 39.9,
        pagamentos: [
          {
            meioPagamentoId: 'mp-pix',
            valor: 50,
            cobrarNaEntrega: true,
            naoEfetivo: true,
          },
        ],
        nomesMeiosPagamentoPorId: { 'mp-pix': 'PIX' },
        considerarApenasNaoCancelados: true,
      })
    ).toBe(0)
  })

  it('usa troco dos lançamentos quando a aba atual é Já foi pago mas há cobrança na entrega', () => {
    expect(
      usarTrocoLancamentoPedido(
        [
          {
            meioPagamentoId: 'mp-dinheiro',
            valor: 10,
            cobrarNaEntrega: true,
            naoEfetivo: true,
          },
        ],
        false
      )
    ).toBe(true)
  })
})
