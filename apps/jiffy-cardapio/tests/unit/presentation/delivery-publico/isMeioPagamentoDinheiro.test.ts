import { describe, expect, it } from 'vitest'
import {
  isMeioPagamentoDinheiro,
  ordenarMeioDinheiroPrimeiro,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/isMeioPagamentoDinheiro'

describe('isMeioPagamentoDinheiro', () => {
  it('reconhece somente tipo dinheiro com nome DINHEIRO', () => {
    expect(
      isMeioPagamentoDinheiro({
        nome: 'DINHEIRO',
        formaPagamentoFiscal: 'dinheiro',
      })
    ).toBe(true)

    expect(
      isMeioPagamentoDinheiro({
        nome: 'Dinheiro',
        formaPagamentoFiscal: 'Dinheiro',
      })
    ).toBe(true)
  })

  it('não pede troco para outros nomes mesmo com tipo dinheiro', () => {
    for (const nome of ['PIX', 'DEBITO', 'CREDITO', 'Débito', 'Crédito']) {
      expect(
        isMeioPagamentoDinheiro({
          nome,
          formaPagamentoFiscal: 'dinheiro',
        })
      ).toBe(false)
    }
  })

  it('não pede troco quando o nome é DINHEIRO mas o tipo não é dinheiro', () => {
    expect(
      isMeioPagamentoDinheiro({
        nome: 'DINHEIRO',
        formaPagamentoFiscal: 'pix',
      })
    ).toBe(false)
  })

  it('coloca DINHEIRO primeiro e preserva a ordem das demais', () => {
    const ordenados = ordenarMeioDinheiroPrimeiro([
      { nome: 'PIX', formaPagamentoFiscal: 'dinheiro' },
      { nome: 'DEBITO', formaPagamentoFiscal: 'dinheiro' },
      { nome: 'CREDITO', formaPagamentoFiscal: 'cartao_credito' },
      { nome: 'DINHEIRO', formaPagamentoFiscal: 'dinheiro' },
    ])

    expect(ordenados.map(meio => meio.nome)).toEqual([
      'DINHEIRO',
      'PIX',
      'DEBITO',
      'CREDITO',
    ])
  })

  it('retorna falso sem meio', () => {
    expect(isMeioPagamentoDinheiro(null)).toBe(false)
    expect(isMeioPagamentoDinheiro(undefined)).toBe(false)
  })
})
