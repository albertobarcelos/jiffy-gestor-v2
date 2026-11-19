import { describe, expect, it } from 'vitest'
import {
  FecharCaixaTerminalSchema,
  MovimentacaoCaixaTerminalSchema,
  SangriaCaixaTerminalSchema,
} from '@/src/application/validators/caixa-terminal/CaixaTerminalInputSchemas'

describe('CaixaTerminalInputSchemas', () => {
  it('aceita fechamento válido', () => {
    const parsed = FecharCaixaTerminalSchema.parse({
      valorFornecido: 120.5,
      fechadoPorId: 'usuario-pdv-1',
    })
    expect(parsed.valorFornecido).toBe(120.5)
    expect(parsed.fechadoPorId).toBe('usuario-pdv-1')
  })

  it('rejeita valor negativo', () => {
    expect(() =>
      FecharCaixaTerminalSchema.parse({
        valorFornecido: -1,
        fechadoPorId: 'usuario-pdv-1',
      })
    ).toThrow()
  })

  it('rejeita responsável vazio', () => {
    expect(() =>
      FecharCaixaTerminalSchema.parse({
        valorFornecido: 10,
        fechadoPorId: '   ',
      })
    ).toThrow()
  })

  it('aceita movimentação válida', () => {
    const parsed = MovimentacaoCaixaTerminalSchema.parse({
      valor: 20,
      descricao: 'Reforço de troco',
      realizadoPorId: 'pdv-1',
    })
    expect(parsed.descricao).toBe('Reforço de troco')
  })

  it('aceita sangria com saldo', () => {
    const parsed = SangriaCaixaTerminalSchema.parse({
      valor: 10,
      descricao: 'Depósito banco',
      realizadoPorId: 'pdv-1',
      saldoDisponivel: 50,
    })
    expect(parsed.saldoDisponivel).toBe(50)
  })
})

