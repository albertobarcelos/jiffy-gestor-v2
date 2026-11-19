import { z } from 'zod'
import { DESCRICAO_MOVIMENTACAO_MIN } from '@/src/shared/constants/caixaEstacao'

export const FecharCaixaTerminalSchema = z
  .object({
    valorFornecido: z
      .number({ invalid_type_error: 'Informe o valor em dinheiro contado.' })
      .finite('Informe o valor em dinheiro contado.')
      .min(0, 'Informe o valor em dinheiro contado.'),
    fechadoPorId: z
      .string({ required_error: 'Selecione o responsável pelo fechamento.' })
      .trim()
      .min(1, 'Selecione o responsável pelo fechamento.'),
  })
  .strict()

export const MovimentacaoCaixaTerminalSchema = z
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
    realizadoPorId: z
      .string({ required_error: 'Selecione o responsável pela movimentação.' })
      .trim()
      .min(1, 'Selecione o responsável pela movimentação.'),
  })
  .strict()

export const SangriaCaixaTerminalSchema = MovimentacaoCaixaTerminalSchema.extend({
  saldoDisponivel: z
    .number({ invalid_type_error: 'Saldo indisponível.' })
    .finite('Saldo indisponível.')
    .min(0, 'Saldo indisponível.'),
}).strict()

export type FecharCaixaTerminalValidada = z.infer<typeof FecharCaixaTerminalSchema>
export type MovimentacaoCaixaTerminalValidada = z.infer<typeof MovimentacaoCaixaTerminalSchema>
export type SangriaCaixaTerminalValidada = z.infer<typeof SangriaCaixaTerminalSchema>
