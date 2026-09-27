import { z } from 'zod'
import { DESCRICAO_MOVIMENTACAO_MIN } from '@/src/shared/constants/caixaEstacao'

export { DESCRICAO_MOVIMENTACAO_MIN }

export const MovimentacaoCaixaEstacaoSchema = z
  .object({
    valor: z
      .number({ invalid_type_error: 'Informe um valor numérico.' })
      .finite('Informe um valor numérico.')
      .positive('Valor deve ser maior que zero.'),
    descricao: z
      .string({ required_error: 'Descrição é obrigatória.' })
      .trim()
      .min(
        DESCRICAO_MOVIMENTACAO_MIN,
        `A descrição deve ter no mínimo ${DESCRICAO_MOVIMENTACAO_MIN} caracteres.`
      ),
  })
  .strict()

export const FecharCaixaEstacaoSchema = z
  .object({
    valorFornecido: z
      .number({ invalid_type_error: 'Informe o valor em dinheiro contado.' })
      .finite('Informe o valor em dinheiro contado.')
      .min(0, 'Informe o valor em dinheiro contado.'),
  })
  .strict()

/** Input interno do use case de sangria (inclui saldo para validação de domínio). */
export const SangriaCaixaEstacaoSchema = MovimentacaoCaixaEstacaoSchema.extend({
  saldoDisponivel: z
    .number({ invalid_type_error: 'Saldo indisponível.' })
    .finite('Saldo indisponível.')
    .min(0, 'Saldo indisponível.'),
}).strict()

export type MovimentacaoCaixaEstacaoValidada = z.infer<typeof MovimentacaoCaixaEstacaoSchema>
export type FecharCaixaEstacaoValidada = z.infer<typeof FecharCaixaEstacaoSchema>
export type SangriaCaixaEstacaoValidada = z.infer<typeof SangriaCaixaEstacaoSchema>
