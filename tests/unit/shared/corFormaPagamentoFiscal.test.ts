import { describe, expect, it } from 'vitest'
import {
  corFormaPagamentoFiscal,
  ehFormaPagamentoDinheiro,
  estiloCardMeioPagamento,
  ordenarMeiosPagamentoPadrao,
  textoContrasteSobreHex,
  varsCardMeioPagamentoLancado,
} from '@/src/shared/utils/corFormaPagamentoFiscal'

function meio(nome: string, fiscal: string) {
  return {
    getNome: () => nome,
    getFormaPagamentoFiscal: () => fiscal,
  }
}

describe('corFormaPagamentoFiscal', () => {
  it('distingue dinheiro, pix e cartão (crédito, débito e vale no mesmo azul)', () => {
    expect(corFormaPagamentoFiscal('dinheiro')).toBe('#00B074')
    expect(corFormaPagamentoFiscal('pix')).toBe('#32BCAD')
    expect(corFormaPagamentoFiscal('cartao_credito')).toBe('#003366')
    expect(corFormaPagamentoFiscal('cartao_debito')).toBe('#003366')
    expect(corFormaPagamentoFiscal('vale_alimentacao')).toBe('#003366')
  })

  it('usa texto claro no PIX e no cartão', () => {
    expect(textoContrasteSobreHex(corFormaPagamentoFiscal('pix'))).toBe('#ffffff')
    expect(textoContrasteSobreHex(corFormaPagamentoFiscal('cartao_credito'))).toBe('#ffffff')
  })

  it('em todo cartão usa verde-limão no ícone e no texto, mais grosso', () => {
    for (const forma of [
      'cartao_credito',
      'cartao_debito',
      'vale_alimentacao',
      'vale_refeicao',
      'vale_presente',
      'vale_combustivel',
    ] as const) {
      const card = estiloCardMeioPagamento(forma)
      expect(card.backgroundColor).toBe('#003366')
      expect(card.color).toBe('#B4DD2B')
      expect(card.labelColor).toBe('#B4DD2B')
      expect(card.labelFontWeight).toBe(600)
    }
    expect(estiloCardMeioPagamento('dinheiro').labelColor).toBe('#ffffff')
    expect(estiloCardMeioPagamento('pix').labelColor).toBe('#ffffff')
  })
})

describe('varsCardMeioPagamentoLancado', () => {
  it('reusa a cor da forma para o chip e o hover forte', () => {
    const vars = varsCardMeioPagamentoLancado('vale_alimentacao')
    expect(vars['--meio-cor']).toBe('#003366')
    expect(vars['--meio-texto-forte']).toBe('#ffffff')
  })
})

describe('ordenarMeiosPagamentoPadrao', () => {
  it('ordena dinheiro, crédito, débito, pix e depois o restante', () => {
    const ordenados = ordenarMeiosPagamentoPadrao([
      meio('VALE ALIMENTACAO', 'vale_alimentacao'),
      meio('PIX', 'pix'),
      meio('DEBITO', 'cartao_debito'),
      meio('CREDITO', 'cartao_credito'),
      meio('DINHEIRO', 'dinheiro'),
      meio('VALE REFEICAO', 'vale_refeicao'),
    ])
    expect(ordenados.map(m => m.getNome())).toEqual([
      'DINHEIRO',
      'CREDITO',
      'DEBITO',
      'PIX',
      'VALE ALIMENTACAO',
      'VALE REFEICAO',
    ])
  })

  it('reconhece dinheiro pelo nome se o fiscal vier errado', () => {
    expect(ehFormaPagamentoDinheiro('outros', 'Dinheiro loja')).toBe(true)
  })
})
