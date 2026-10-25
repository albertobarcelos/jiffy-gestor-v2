import { describe, expect, it } from 'vitest'
import { deveLimparPagamentosAoTrocarTipo } from '@/src/domain/policies/pedido/MeiosPagamentoNovoPedidoPolicy'

describe('deveLimparPagamentosAoTrocarTipo', () => {
  it('limpa pagamentos ao alternar modalidade em pedido novo', () => {
    expect(
      deveLimparPagamentosAoTrocarTipo({
        tipoAtual: 'entrega',
        tipoNovo: 'retirada',
        pedidoExistente: false,
      })
    ).toBe(true)
    expect(
      deveLimparPagamentosAoTrocarTipo({
        tipoAtual: 'retirada',
        tipoNovo: 'entrega',
        pedidoExistente: false,
      })
    ).toBe(true)
  })

  it('não limpa pagamentos quando a modalidade não mudou ou o pedido já existe', () => {
    expect(
      deveLimparPagamentosAoTrocarTipo({
        tipoAtual: 'entrega',
        tipoNovo: 'entrega',
        pedidoExistente: false,
      })
    ).toBe(false)
    expect(
      deveLimparPagamentosAoTrocarTipo({
        tipoAtual: 'entrega',
        tipoNovo: 'retirada',
        pedidoExistente: true,
      })
    ).toBe(false)
  })
})
