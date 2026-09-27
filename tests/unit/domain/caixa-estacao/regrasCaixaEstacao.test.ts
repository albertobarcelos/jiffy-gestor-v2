import { describe, expect, it } from 'vitest'
import {
  calcularDiferencaFechamento,
  validarMovimentacaoCaixaEstacao,
  validarSangriaContraSaldo,
  validarSuprimentoCaixaEstacao,
} from '@/src/domain/caixa-estacao/regrasCaixaEstacao'
import { interpretarCaixaEstacaoAtual } from '@/src/application/use-cases/caixa-estacao/BuscarCaixaEstacaoAtualUseCase'

describe('Caixa da estação — regras de negócio', () => {
  describe('quando consultamos se o caixa está aberto', () => {
    it('mostra o caixa como fechado quando a API responde 404', () => {
      expect(
        interpretarCaixaEstacaoAtual(404, { message: 'Operação de caixa não encontrada' })
      ).toEqual({
        aberta: false,
        operacao: null,
      })
    })

    it('mostra o caixa como aberto quando a API responde 200 com dados', () => {
      const resultado = interpretarCaixaEstacaoAtual(200, { status: 'aberto', id: 'abc' })
      expect(resultado.aberta).toBe(true)
    })
  })

  describe('quando alguém registra sangria ou suprimento', () => {
    it('pede uma descrição com pelo menos 5 caracteres', () => {
      const resultado = validarMovimentacaoCaixaEstacao({
        valor: 10,
        descricao: 'abc',
      })

      expect(resultado.ok).toBe(false)
      if (!resultado.ok) {
        expect(resultado.campo).toBe('descricao')
      }
    })

    it('não aceita sangria ou fundo de troco com valor zero', () => {
      const sangria = validarMovimentacaoCaixaEstacao({
        valor: 0,
        descricao: 'Retirada para banco',
      })

      expect(sangria.ok).toBe(false)
      if (!sangria.ok) {
        expect(sangria.message).toBe('Valor da sangria deve ser maior que zero.')
      }

      const abertura = validarSuprimentoCaixaEstacao({
        valor: 0,
        descricao: 'Fundo de troco',
      })
      expect(abertura.ok).toBe(false)
    })

    it('aceita um fundo de troco válido para abrir o caixa', () => {
      const abertura = validarSuprimentoCaixaEstacao({
        valor: 50,
        descricao: 'Fundo de troco',
      })

      expect(abertura.ok).toBe(true)
    })
  })

  describe('quando alguém faz uma sangria', () => {
    it('não deixa retirar mais dinheiro do que há em caixa', () => {
      const saldoEmCaixa = 30
      const tentativaSangria = 40

      const resultado = validarSangriaContraSaldo(tentativaSangria, saldoEmCaixa)

      expect(resultado.ok).toBe(false)
      if (!resultado.ok) {
        expect(resultado.campo).toBe('valor')
      }
    })

    it('permite sangria até o limite do saldo disponível', () => {
      const saldoEmCaixa = 30

      expect(validarSangriaContraSaldo(30, saldoEmCaixa).ok).toBe(true)
      expect(validarSangriaContraSaldo(29.99, saldoEmCaixa).ok).toBe(true)
    })
  })

  describe('quando o operador fecha o caixa e conta o dinheiro', () => {
    it('calcula sobra quando contou mais do que o sistema esperava', () => {
      const valorContado = 59.4
      const valorEsperado = 55.9

      expect(calcularDiferencaFechamento(valorContado, valorEsperado)).toBe(3.5)
    })

    it('calcula falta quando contou menos do que o sistema esperava', () => {
      const valorContado = 50
      const valorEsperado = 55.9

      expect(calcularDiferencaFechamento(valorContado, valorEsperado)).toBe(-5.9)
    })
  })
})
