import { describe, expect, it } from 'vitest'
import {
  comEntregadorNoRelatorio,
  deveBuscarProximaPaginaComissao,
  hasNextPaginaComissaoRelatorio,
  juntarPaginasComissaoEntregador,
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

describe('paginação da comissão', () => {
  it('para quando a API diz que não há próxima', () => {
    expect(
      deveBuscarProximaPaginaComissao({ itensNaPagina: 50, limit: 50, hasNext: false })
    ).toBe(false)
    expect(
      deveBuscarProximaPaginaComissao({ itensNaPagina: 50, limit: 50, hasNext: true })
    ).toBe(true)
    expect(deveBuscarProximaPaginaComissao({ itensNaPagina: 50, limit: 50 })).toBe(true)
    expect(deveBuscarProximaPaginaComissao({ itensNaPagina: 12, limit: 50 })).toBe(false)
  })

  it('lê hasNext do bloco vendas', () => {
    expect(hasNextPaginaComissaoRelatorio({ vendas: { hasNext: true } })).toBe(true)
    expect(hasNextPaginaComissaoRelatorio({ vendas: { items: [] } })).toBeUndefined()
  })

  it('junta páginas sem duplicar e preserva o total da primeira', () => {
    const junta = juntarPaginasComissaoEntregador([
      {
        totalTaxas: 80,
        quantidade: 3,
        itens: [
          {
            id: '1',
            codigoVenda: 'A',
            numeroVenda: 1,
            clienteNome: 'A',
            taxaEntrega: 10,
            valorFinal: 20,
            dataFinalizacao: null,
          },
          {
            id: '2',
            codigoVenda: 'B',
            numeroVenda: 2,
            clienteNome: 'B',
            taxaEntrega: 20,
            valorFinal: 30,
            dataFinalizacao: null,
          },
        ],
      },
      {
        totalTaxas: 80,
        quantidade: 3,
        itens: [
          {
            id: '2',
            codigoVenda: 'B',
            numeroVenda: 2,
            clienteNome: 'B',
            taxaEntrega: 20,
            valorFinal: 30,
            dataFinalizacao: null,
          },
          {
            id: '3',
            codigoVenda: 'C',
            numeroVenda: 3,
            clienteNome: 'C',
            taxaEntrega: 50,
            valorFinal: 60,
            dataFinalizacao: null,
          },
        ],
      },
    ])
    expect(junta.itens.map(item => item.id)).toEqual(['1', '2', '3'])
    expect(junta.quantidade).toBe(3)
    expect(junta.totalTaxas).toBe(80)
  })
})

describe('comEntregadorNoRelatorio', () => {
  it('injeta o id da URL quando falta entregador', () => {
    expect(comEntregadorNoRelatorio({ somaTaxasEntrega: 1 }, 'abc').entregador).toMatchObject({
      id: 'abc',
    })
  })
})
