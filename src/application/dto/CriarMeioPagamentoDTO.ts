import { z } from 'zod'

/**
 * Schema de validação para criar meio de pagamento
 */
export const CriarMeioPagamentoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tefAtivo: z.boolean().optional().default(true),
  formaPagamentoFiscal: z.string().optional().default('Dinheiro'),
  ativo: z.boolean().optional().default(true),
})

export type CriarMeioPagamentoDTO = z.infer<typeof CriarMeioPagamentoSchema>

