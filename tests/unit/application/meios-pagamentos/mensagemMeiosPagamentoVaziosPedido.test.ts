import { describe, expect, it } from 'vitest'
import { mensagemMeiosPagamentoVaziosPedido } from '@/src/application/meios-pagamentos/mensagemMeiosPagamentoVaziosPedido'

describe('mensagemMeiosPagamentoVaziosPedido', () => {
  it('balcão aponta para Terminal', () => {
    expect(
      mensagemMeiosPagamentoVaziosPedido({
        pedidoDeliveryGestor: false,
        pedidoComRetirada: false,
      })
    ).toMatch(/Terminal/i)
  })

  it('delivery retirada aponta para coluna Retirada', () => {
    expect(
      mensagemMeiosPagamentoVaziosPedido({
        pedidoDeliveryGestor: true,
        pedidoComRetirada: true,
      })
    ).toMatch(/retirada/i)
  })

  it('delivery entrega aponta para coluna Entrega', () => {
    expect(
      mensagemMeiosPagamentoVaziosPedido({
        pedidoDeliveryGestor: true,
        pedidoComRetirada: false,
      })
    ).toMatch(/entrega/i)
  })
})
