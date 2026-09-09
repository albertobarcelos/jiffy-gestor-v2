import { describe, expect, it } from 'vitest'
import {
  corFormaPagamentoFiscal,
  ehFormaPagamentoDinheiro,
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
  it('distingue dinheiro, pix, cartão e vale', () => {
    expect(corFormaPagamentoFiscal('dinheiro')).toBe('#00B074')
    expect(corFormaPagamentoFiscal('pix')).toBe('#B4DD2B')
    expect(corFormaPagamentoFiscal('cartao_credito')).toBe('#003366')
    expect(corFormaPagamentoFiscal('vale_alimentacao')).toBe('#530CA3')
  })

  it('usa texto escuro no PIX lima e claro no cartão', () => {
    expect(textoContrasteSobreHex(corFormaPagamentoFiscal('pix'))).toBe('#1a1a1a')
    expect(textoContrasteSobreHex(corFormaPagamentoFiscal('cartao_credito'))).toBe('#ffffff')
  })
})

describe('varsCardMeioPagamentoLancado', () => {
  it('reusa a cor da forma para o chip e o hover forte', () => {
    const vars = varsCardMeioPagamentoLancado('vale_alimentacao')
    expect(vars['--meio-cor']).toBe('#530CA3')
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
