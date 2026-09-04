import { z } from 'zod'

const geoJsonPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
})

const enderecoLocalizacaoInputSchema = geoJsonPointSchema.extend({
  geocoding: z
    .object({
      provider: z.enum(['GOOGLE']).optional(),
      enderecoId: z.string().min(1).optional(),
    })
    .optional(),
})

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
  enderecoLocalizacao: enderecoLocalizacaoInputSchema.optional(),
  preferenciaEntrega: geoJsonPointSchema.optional(),
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

/**
 * Referência ao cliente delivery já cadastrado (cotação e create pedido público).
 * Spec backend: apenas `telefone`; em entrega, também `enderecoIdEntrega`.
 * Nome/CPF/endereços devem ser persistidos via POST/PATCH /delivery/clientes antes.
 */
export const ClienteReferenciaPedidoPublicoInputSchema = z
  .object({
    telefone: z.string().min(8),
    enderecoIdEntrega: z.string().min(1).optional(),
  })
  .strict()

/** Cadastro/atualização do cliente delivery (rotas POST/PATCH /delivery/clientes). */
export const ClienteCadastroDeliveryPublicoInputSchema = z.object({
  telefone: z.string().min(8),
  nome: z.string().nullable().optional(),
  cpf: cpfDigitsSchema,
  enderecos: z.array(EnderecoDeliveryPublicoInputSchema).optional(),
})

/** @deprecated Use ClienteReferenciaPedidoPublicoInputSchema ou ClienteCadastroDeliveryPublicoInputSchema */
export const ClientePedidoPublicoInputSchema = ClienteReferenciaPedidoPublicoInputSchema

export const CobrancaPedidoPublicoInputSchema = z.object({
  meioPagamentoId: z.string().min(1),
  valor: z.number().positive(),
  momentoCobranca: z.literal('na_entrega'),
})

export const CotacaoPedidoPublicoInputSchema = z.object({
  slug: z.string().min(1),
  tipoEntrega: z.enum(['entrega', 'retirada']),
  cliente: ClienteReferenciaPedidoPublicoInputSchema,
  produtos: z.array(ProdutoPedidoPublicoInputSchema).min(1),
})

export const CreatePedidoPublicoInputSchema = z.object({
  slug: z.string().min(1),
  origem: z.literal('JIFFY_DELIVERY'),
  tokenCotacao: z.string().min(1),
  tipoEntrega: z.enum(['entrega', 'retirada']),
  cliente: ClienteReferenciaPedidoPublicoInputSchema,
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
export type ClienteReferenciaPedidoPublicoInput = z.infer<
  typeof ClienteReferenciaPedidoPublicoInputSchema
>
export type ClienteCadastroDeliveryPublicoInput = z.infer<
  typeof ClienteCadastroDeliveryPublicoInputSchema
>
export type ClientePedidoPublicoInput = ClienteReferenciaPedidoPublicoInput
export type CobrancaPedidoPublicoInput = z.infer<typeof CobrancaPedidoPublicoInputSchema>
export type CotacaoPedidoPublicoInput = z.infer<typeof CotacaoPedidoPublicoInputSchema>
export type CreatePedidoPublicoInput = z.infer<typeof CreatePedidoPublicoInputSchema>
export type CriarClienteDeliveryPublicoInput = z.infer<
  typeof CriarClienteDeliveryPublicoInputSchema
>
export type AtualizarClienteDeliveryPublicoInput = z.infer<
  typeof AtualizarClienteDeliveryPublicoInputSchema
>
