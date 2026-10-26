import { z } from 'zod'

/**
 * Schema de validação para criar meio de pagamento
 */
export const TipoParcelamentoSchema = z.enum(['jurosVendedor', 'jurosCliente'])

export const CriarMeioPagamentoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tefAtivo: z.boolean().optional().default(true),
  ativoEntregaDelivery: z.boolean().optional(),
  ativoRetiradaDelivery: z.boolean().optional(),
  /** @deprecated Use ativoEntregaDelivery. */
  ativoDelivery: z.boolean().optional(),
  formaPagamentoFiscal: z.string().optional().default('Dinheiro'),
  ativo: z.boolean().optional().default(true),
  isParcelavel: z.boolean().optional().default(false),
  tipoParcelamento: TipoParcelamentoSchema.optional(),
}).transform(({ ativoDelivery, ativoEntregaDelivery, ...data }) => ({
  ...data,
  ativoEntregaDelivery: ativoEntregaDelivery ?? ativoDelivery ?? false,
  ativoRetiradaDelivery: data.ativoRetiradaDelivery ?? ativoDelivery ?? false,
}))

export type CriarMeioPagamentoDTO = z.infer<typeof CriarMeioPagamentoSchema>
