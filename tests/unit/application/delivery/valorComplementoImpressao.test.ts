import { describe, expect, it } from 'vitest'
import {
  magnitudeValorComplementoLancamento,
  valorAssinadoComplementoImpressao,
  valorComplementoParaExibicaoCupom,
} from '@/src/application/delivery/valorComplementoImpressao'
import { montarTicketsResponseFromInstrucoes } from '@/src/application/delivery/montarTicketsResponseFromInstrucoes'
import { DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY } from '@/src/shared/types/deliveryImpressao'

describe('valorComplementoImpressao', () => {
  it('prefere valor do lançamento/cardápio a valorUnitario de cadastro', () => {
    expect(
      magnitudeValorComplementoLancamento({ valor: 5, valorUnitario: 10 })
    ).toBe(5)
    expect(magnitudeValorComplementoLancamento({ valorUnitario: 10 })).toBe(10)
  })

  it('aplica tipoImpacto no valor assinado', () => {
    expect(valorAssinadoComplementoImpressao('aumenta', 10, 2)).toEqual({
      valorUnitario: 10,
      valorFinal: 20,
    })
    expect(valorAssinadoComplementoImpressao('diminui', 10, 2)).toEqual({
      valorUnitario: -10,
      valorFinal: -20,
    })
    expect(valorAssinadoComplementoImpressao('nenhum', 10, 2)).toEqual({
      valorUnitario: 10,
      valorFinal: 0,
    })
  })

  it('exibe diminui negativo mesmo com impressao.valorFinal positivo legado', () => {
    expect(
      valorComplementoParaExibicaoCupom({
        tipoImpactoPreco: 'diminui',
        quantidade: 2,
        impressao: { valorUnitario: 10, valorFinal: 20, quantidade: 2 },
      })
    ).toBe(-20)
  })
})

describe('montarTicketsResponseFromInstrucoes — impacto complemento', () => {
  it('expedição grava impressao assinada e usa valor do cardápio', () => {
    const result = montarTicketsResponseFromInstrucoes({
      instrucoes: {
        mapeamentos: [
          {
            impressoraId: 'imp-exp',
            impressoraNome: 'Expedição',
            nomeImpressoraWindows: 'EPSON_EXP',
            produtosLancadosIds: ['pl-1'],
          },
        ],
        warnings: [],
      },
      pedido: {
        id: 'venda-1',
        numeroVenda: 1,
        codigoVenda: 'X1',
        tipoEntrega: 'retirada',
        valorFinal: 29.9,
        totalPago: 29.9,
        totalFaltaPagar: 0,
        dataCriacao: '2026-06-15T10:00:00.000Z',
        produtosLancados: [
          {
            id: 'pl-1',
            produtoId: 'p-1',
            nomeProduto: 'BIG GOMES',
            quantidade: 1,
            valorUnitario: 39.9,
            valorFinal: 29.9,
            removido: false,
            observacoes: [],
            complementos: [
              {
                complementoId: 'c-farinha',
                nomeComplemento: 'Farinha',
                quantidade: 1,
                valor: 10,
                valorUnitario: 99,
                tipoImpactoPreco: 'diminui',
              },
            ],
          },
        ],
        cobrancas: [],
        taxasLancadas: [],
        observacoes: [],
      },
      prefs: {
        ...DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
        modo: 'unificado',
        impressoraExpedicaoId: 'imp-exp',
      },
      empresa: { id: 'emp-1', nomeExibicao: 'Loja' },
      estacaoImpressaoId: 'est-1',
    })

    const comp = result.tickets[0].itens[0].complementos?.[0]
    expect(comp?.tipoImpactoPreco).toBe('diminui')
    expect(comp?.impressao?.valorUnitario).toBe(-10)
    expect(comp?.impressao?.valorFinal).toBe(-10)
    expect(result.resumoPedido?.valorAdicionais).toBe(-10)
  })
})
