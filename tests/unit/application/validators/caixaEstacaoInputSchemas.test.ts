import { describe, expect, it } from 'vitest'
import {
  FecharCaixaEstacaoSchema,
  MovimentacaoCaixaEstacaoSchema,
  SangriaCaixaEstacaoSchema,
} from '@/src/application/validators/caixa-estacao/CaixaEstacaoInputSchemas'

describe('CaixaEstacaoInputSchemas', () => {
  it('aceita movimentação válida', () => {
    const parsed = MovimentacaoCaixaEstacaoSchema.parse({
      valor: 10,
      descricao: 'Fundo de troco',
    })
    expect(parsed.descricao).toBe('Fundo de troco')
  })

  it('rejeita descrição curta', () => {
    expect(() =>
      MovimentacaoCaixaEstacaoSchema.parse({ valor: 10, descricao: 'abc' })
    ).toThrow()
  })

  it('rejeita valor zero no fechamento negativo', () => {
    expect(() => FecharCaixaEstacaoSchema.parse({ valorFornecido: -1 })).toThrow()
  })

  it('aceita sangria com saldo informado', () => {
    const parsed = SangriaCaixaEstacaoSchema.parse({
      valor: 5,
      descricao: 'Sangria teste',
      saldoDisponivel: 50,
    })
    expect(parsed.saldoDisponivel).toBe(50)
  })
})
