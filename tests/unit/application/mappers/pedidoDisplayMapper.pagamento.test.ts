import { describe, expect, it } from 'vitest'
import {
  montarLinhasResumoPagamentoPedido,
  totalCobrarNaEntregaPagamentos,
} from '@/src/application/mappers/PedidoDisplayMapper'

const formatar = (valor: number) => `R$ ${valor.toFixed(2).replace('.', ',')}`

describe('resumo de pagamento misto', () => {
  it('separa já pago de cobrar na entrega com valores', () => {
    const linhas = montarLinhasResumoPagamentoPedido(
      [
        { meioPagamentoId: 'mp-dinheiro', valor: 30 },
        {
          meioPagamentoId: 'mp-credito',
          valor: 15,
          cobrarNaEntrega: true,
          naoEfetivo: true,
        },
      ],
      [
        { getId: () => 'mp-dinheiro', getNome: () => 'DINHEIRO' },
        { getId: () => 'mp-credito', getNome: () => 'CREDITO' },
      ],
      {},
      formatar
    )

    expect(linhas).toEqual([
      { kind: 'ja_pago', texto: 'Já pago: DINHEIRO R$ 30,00' },
      { kind: 'cobrar', texto: 'Cobrar na entrega: CREDITO R$ 15,00' },
    ])
    expect(
      totalCobrarNaEntregaPagamentos([
        { meioPagamentoId: 'mp-dinheiro', valor: 30 },
        { meioPagamentoId: 'mp-credito', valor: 15, cobrarNaEntrega: true, naoEfetivo: true },
      ])
    ).toBe(15)
  })
})
