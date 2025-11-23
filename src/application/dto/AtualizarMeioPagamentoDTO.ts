import { z } from 'zod'

/**
 * Schema de validação para atualizar meio de pagamento
 */
export const AtualizarMeioPagamentoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  tefAtivo: z.boolean().optional(),
  formaPagamentoFiscal: z.string().optional(),
  ativo: z.boolean().optional(),
})

export type AtualizarMeioPagamentoDTO = z.infer<typeof AtualizarMeioPagamentoSchema>

