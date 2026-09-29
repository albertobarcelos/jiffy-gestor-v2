import { describe, expect, it } from 'vitest'
import { OperacaoCaixaEstacao } from '@/src/domain/entities/OperacaoCaixaEstacao'

const baseProps = {
  id: 'op-1',
  status: 'aberto' as const,
  empresaId: 'emp-1',
  abertoPorAtor: { id: 'a1', type: 'user', sourceReference: 'u1', nome: 'Operador' },
  estacao: { id: 'est-1', nome: 'Cozinha' },
  dataAbertura: '2026-01-01T10:00:00.000Z',
  dataFechamento: null,
  fechadoPorAtor: null,
  resumoCaixa: {
    totalSuprimento: 100,
    totalSangria: 20,
    valorLiquidoDinheiroCaixa: 80,
  },
}

describe('OperacaoCaixaEstacao', () => {
  it('identifica operação aberta', () => {
    const operacao = OperacaoCaixaEstacao.create(baseProps)
    expect(operacao.isAberta()).toBe(true)
  })

  it('identifica operação fechada', () => {
    const operacao = OperacaoCaixaEstacao.create({ ...baseProps, status: 'fechado' })
    expect(operacao.isAberta()).toBe(false)
  })

  it('expõe saldo em dinheiro do resumo', () => {
    const operacao = OperacaoCaixaEstacao.create(baseProps)
    expect(operacao.getValorLiquidoDinheiroCaixa()).toBe(80)
  })

  it('rejeita id ausente', () => {
    expect(() => OperacaoCaixaEstacao.create({ ...baseProps, id: '  ' })).toThrow(
      'Operação de caixa inválida: id ausente.'
    )
  })
})
