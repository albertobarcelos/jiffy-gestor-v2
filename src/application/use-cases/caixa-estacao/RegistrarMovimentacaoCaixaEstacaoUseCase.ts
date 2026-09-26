import type { MovimentacaoCaixaEstacaoInput } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import {
  validarMovimentacaoCaixaEstacao,
  validarSangriaContraSaldo,
  validarSuprimentoCaixaEstacao,
} from '@/src/domain/caixa-estacao/regrasCaixaEstacao'

export function prepararSangriaCaixaEstacao(
  input: MovimentacaoCaixaEstacaoInput & { saldoDisponivel: number }
) {
  const validacao = validarMovimentacaoCaixaEstacao(input)
  if (!validacao.ok) throw new Error(validacao.message)
  const validacaoSaldo = validarSangriaContraSaldo(input.valor, input.saldoDisponivel)
  if (!validacaoSaldo.ok) throw new Error(validacaoSaldo.message)
  return { valor: input.valor, descricao: input.descricao.trim() }
}

export function prepararSuprimentoCaixaEstacao(input: MovimentacaoCaixaEstacaoInput) {
  const validacao = validarSuprimentoCaixaEstacao(input)
  if (!validacao.ok) {
    throw new Error(validacao.message)
  }
  return { valor: input.valor, descricao: input.descricao.trim() }
}
