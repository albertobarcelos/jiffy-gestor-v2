import { z } from 'zod'

const cpfDigitsSchema = z
  .string()
  .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
  .nullable()
  .optional()

export const EnderecoDeliveryPublicoInputSchema = z.object({
  etiqueta: z.enum(['casa', 'trabalho', 'outro']),
  rua: z.string().min(1),
  numero: z.string().min(1),
  bairro: z.string().min(1),
  cidade: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  cep: z.string().optional(),
  complemento: z.string().nullable().optional(),
})

export const ComplementoPedidoPublicoInputSchema = z.object({
  complementoId: z.string().min(1),
  grupoComplementoId: z.string().min(1),
  quantidade: z.number().positive(),
})

export const ProdutoPedidoPublicoInputSchema = z.object({
  produtoId: z.string().min(1),
  quantidade: z.number().positive(),
  observacoes: z.array(z.string()).optional(),
  complementos: z.array(ComplementoPedidoPublicoInputSchema).optional(),
})

export const ClientePedidoPublicoInputSchema = z.object({
  telefone: z.string().min(8),
  nome: z.string().nullable().optional(),
  cpf: cpfDigitsSchema,
  enderecoIdEntrega: z.string().nullable().optional(),
  enderecos: z.array(EnderecoDeliveryPublicoInputSchema).optional(),
})

export const CobrancaPedidoPublicoInputSchema = z.object({
  meioPagamentoId: z.string().min(1),
  valor: z.number().positive(),
  momentoCobranca: z.literal('na_entrega'),
})

export const CreatePedidoPublicoInputSchema = z.object({
  slug: z.string().min(1),
  origem: z.literal('JIFFY_DELIVERY'),
  tipoEntrega: z.enum(['entrega', 'retirada']),
  cliente: ClientePedidoPublicoInputSchema,
  documentoCpfCnpj: z
    .string()
    .regex(/^\d{11}$|^\d{14}$/)
    .nullable()
    .optional(),
  produtos: z.array(ProdutoPedidoPublicoInputSchema).min(1),
  cobrancas: z.array(CobrancaPedidoPublicoInputSchema).optional(),
  observacoes: z.array(z.string()).optional(),
})

export const CriarClienteDeliveryPublicoInputSchema = z.object({
  telefone: z.string().min(8),
  nome: z.string().nullable().optional(),
  cpf: cpfDigitsSchema,
  enderecos: z.array(EnderecoDeliveryPublicoInputSchema).optional(),
})

export const AtualizarClienteDeliveryPublicoInputSchema = z.object({
  nome: z.string().nullable().optional(),
  cpf: cpfDigitsSchema,
  enderecos: z
    .object({
      create: z.array(EnderecoDeliveryPublicoInputSchema).optional(),
      update: z
        .array(EnderecoDeliveryPublicoInputSchema.extend({ id: z.string().min(1) }))
        .optional(),
      delete: z.array(z.string().min(1)).optional(),
    })
    .optional(),
})

export type EnderecoDeliveryPublicoInput = z.infer<typeof EnderecoDeliveryPublicoInputSchema>
export type ComplementoPedidoPublicoInput = z.infer<typeof ComplementoPedidoPublicoInputSchema>
export type ProdutoPedidoPublicoInput = z.infer<typeof ProdutoPedidoPublicoInputSchema>
export type ClientePedidoPublicoInput = z.infer<typeof ClientePedidoPublicoInputSchema>
export type CobrancaPedidoPublicoInput = z.infer<typeof CobrancaPedidoPublicoInputSchema>
export type CreatePedidoPublicoInput = z.infer<typeof CreatePedidoPublicoInputSchema>
export type CriarClienteDeliveryPublicoInput = z.infer<
  typeof CriarClienteDeliveryPublicoInputSchema
>
export type AtualizarClienteDeliveryPublicoInput = z.infer<
  typeof AtualizarClienteDeliveryPublicoInputSchema
>
