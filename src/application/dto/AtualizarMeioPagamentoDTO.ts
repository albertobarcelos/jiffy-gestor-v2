import { z } from 'zod'
import { TipoParcelamentoSchema } from '@/src/application/dto/CriarMeioPagamentoDTO'

/**
 * Schema de validação para atualizar meio de pagamento
 */
export const AtualizarMeioPagamentoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  tefAtivo: z.boolean().optional(),
  ativoEntregaDelivery: z.boolean().optional(),
  ativoRetiradaDelivery: z.boolean().optional(),
  /** @deprecated Use ativoEntregaDelivery. */
  ativoDelivery: z.boolean().optional(),
  formaPagamentoFiscal: z.string().optional(),
  ativo: z.boolean().optional(),
  isParcelavel: z.boolean().optional(),
  tipoParcelamento: TipoParcelamentoSchema.optional(),
}).transform(({ ativoDelivery, ativoEntregaDelivery, ativoRetiradaDelivery, ...data }) => ({
  ...data,
  ...(ativoDelivery !== undefined || ativoEntregaDelivery !== undefined
    ? { ativoEntregaDelivery: ativoEntregaDelivery ?? ativoDelivery }
    : {}),
  ...(ativoDelivery !== undefined || ativoRetiradaDelivery !== undefined
    ? { ativoRetiradaDelivery: ativoRetiradaDelivery ?? ativoDelivery }
    : {}),
}))

export type AtualizarMeioPagamentoDTO = z.infer<typeof AtualizarMeioPagamentoSchema>
