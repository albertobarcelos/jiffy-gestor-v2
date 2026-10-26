import { describe, expect, it } from 'vitest'
import {
  comEntregadorNoRelatorio,
  montarComissaoEntregadorApp,
} from '@/src/application/expedicao/app/montarComissaoEntregadorApp'

describe('montarComissaoEntregadorApp', () => {
  it('usa totais do relatório quando o entregador vem aninhado', () => {
    const comissao = montarComissaoEntregadorApp(
      {
        entregador: { id: 'e1', nome: 'João' },
        countEntregasParticipadas: 2,
        somaTaxasEntrega: 15,
        valorTotalEntregasParticipadas: 80,
        vendas: {
          items: [
            {
              id: 'v1',
              codigoVenda: 'ABC',
              numeroVenda: 12,
              valorFinal: 40,
              taxaEntrega: 7,
              cliente: { nome: 'Ana' },
            },
          ],
        },
      },
      'e1'
    )
    expect(comissao.totalTaxas).toBe(15)
    expect(comissao.quantidade).toBe(2)
    expect(comissao.itens[0]).toMatchObject({
      codigoVenda: 'ABC',
      numeroVenda: 12,
      taxaEntrega: 7,
      clienteNome: 'Ana',
    })
  })

  it('não zera quando a API omite o objeto entregador', () => {
    const comissao = montarComissaoEntregadorApp(
      {
        countEntregasParticipadas: 1,
        somaTaxasEntrega: 8,
        vendas: {
          items: [{ id: 'v1', codigoVenda: 'XYZ', valorFinal: 30, taxaEntrega: 8 }],
        },
      },
      'e9'
    )
    expect(comissao.quantidade).toBe(1)
    expect(comissao.totalTaxas).toBe(8)
  })

  it('soma taxas das vendas se o resumo não vier', () => {
    const comissao = montarComissaoEntregadorApp(
      {
        items: [
          { id: 'v1', codigoVenda: 'A', valorFinal: 10, taxaEntrega: 5 },
          { id: 'v2', codigoVenda: 'B', valorFinal: 10, taxaEntrega: 4 },
        ],
      },
      'e1'
    )
    expect(comissao.quantidade).toBe(2)
    expect(comissao.totalTaxas).toBe(9)
  })
})

describe('comEntregadorNoRelatorio', () => {
  it('injeta o id da URL quando falta entregador', () => {
    expect(comEntregadorNoRelatorio({ somaTaxasEntrega: 1 }, 'abc').entregador).toMatchObject({
      id: 'abc',
    })
  })
})
