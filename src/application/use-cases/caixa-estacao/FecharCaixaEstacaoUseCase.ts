import type { FecharCaixaEstacaoInput } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import {
  calcularDiferencaFechamento,
  validarFechamentoCaixaEstacao,
} from '@/src/domain/caixa-estacao/regrasCaixaEstacao'

export function prepararFechamentoCaixaEstacao(input: FecharCaixaEstacaoInput) {
  const validacao = validarFechamentoCaixaEstacao(input.valorFornecido)
  if (!validacao.ok) throw new Error(validacao.message)
  return { valorFornecido: Number(input.valorFornecido.toFixed(2)) }
}

export function previewDiferencaFechamento(
  valorFornecido: number,
  valorLiquidoDinheiroCaixa: number
): number {
  return calcularDiferencaFechamento(valorFornecido, valorLiquidoDinheiroCaixa)
}
