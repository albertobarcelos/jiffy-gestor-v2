import { describe, expect, it } from 'vitest'
import { agregarFormasPagamentoRelatorio } from '@/src/presentation/utils/vendas/vendasPagamentoExport'
import type { VendaListItem, VendaListPagamentoItem } from '@/src/presentation/utils/vendas/vendasListTypes'

function venda(partial: Partial<VendaListItem> = {}): VendaListItem {
  return {
    id: 'v-1',
    numeroVenda: 1,
    codigoVenda: 'A1',
    valorFinal: 100,
    tipoVenda: 'balcao',
    abertoPorId: 'u-1',
    codigoTerminal: '',
    terminalId: '',
    dataCriacao: '2026-09-25T10:00:00.000Z',
    dataFinalizacao: '2026-09-25T11:00:00.000Z',
    ...partial,
  }
}

function pagamento(partial: Partial<VendaListPagamentoItem> = {}): VendaListPagamentoItem {
  return {
    meioPagamentoId: 'pix-1',
    meioPagamentoNome: 'PIX',
    valor: 100,
    ...partial,
  }
}

describe('agregarFormasPagamentoRelatorio', () => {
  it('soma só vendas faturadas e ignora canceladas', () => {
    const pagamentos = new Map<string, VendaListPagamentoItem[]>([
      ['ok', [pagamento({ valor: 40 })]],
      ['canc', [pagamento({ valor: 80, meioPagamentoId: 'din-1', meioPagamentoNome: 'Dinheiro' })]],
    ])
    const metodos = agregarFormasPagamentoRelatorio(
      [
        venda({ id: 'ok', valorFinal: 40 }),
        venda({
          id: 'canc',
          valorFinal: 80,
          dataCancelamento: '2026-09-25T12:00:00.000Z',
        }),
      ],
      pagamentos,
      new Map()
    )

    expect(metodos).toHaveLength(1)
    expect(metodos[0]?.metodo).toBe('PIX')
    expect(metodos[0]?.valor).toBe(40)
  })

  it('agrupa por meio e marca venda sem pagamento', () => {
    const metodos = agregarFormasPagamentoRelatorio(
      [
        venda({
          id: 'a',
          valorFinal: 30,
        }),
        venda({
          id: 'b',
          valorFinal: 70,
        }),
      ],
      new Map([
        ['a', [pagamento({ valor: 10 }), pagamento({ valor: 20 })]],
        ['b', []],
      ]),
      new Map()
    )

    expect(metodos.map(m => m.metodo)).toEqual(['Sem forma registrada', 'PIX'])
    expect(metodos[0]?.valor).toBe(70)
    expect(metodos[1]?.valor).toBe(30)
    expect(metodos[1]?.quantidade).toBe(2)
    expect(metodos[0]?.percentual).toBe(70)
    expect(metodos[1]?.percentual).toBe(30)
  })

  it('descarta TEF não confirmado', () => {
    const metodos = agregarFormasPagamentoRelatorio(
      [venda({ id: 'tef' })],
      new Map([
        [
          'tef',
          [
            pagamento({
              valor: 100,
              isTefUsed: true,
              isTefConfirmed: false,
            }),
          ],
        ],
      ]),
      new Map()
    )

    expect(metodos[0]?.metodo).toBe('Sem forma registrada')
    expect(metodos[0]?.valor).toBe(100)
  })

  it('abate o troco do dinheiro para o total bater com o valorFinal', () => {
    const metodos = agregarFormasPagamentoRelatorio(
      [venda({ id: 'mista', valorFinal: 100 })],
      new Map([
        [
          'mista',
          [
            pagamento({ valor: 50 }),
            pagamento({
              meioPagamentoId: 'din-1',
              meioPagamentoNome: 'DINHEIRO',
              valor: 70,
            }),
          ],
        ],
      ]),
      new Map()
    )

    const pix = metodos.find(m => m.metodo === 'PIX')
    const dinheiro = metodos.find(m => m.metodo === 'DINHEIRO')
    expect(pix?.valor).toBe(50)
    expect(dinheiro?.valor).toBe(50)
    expect(metodos.reduce((s, m) => s + m.valor, 0)).toBe(100)
  })
})
