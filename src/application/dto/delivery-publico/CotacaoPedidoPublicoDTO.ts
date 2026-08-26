import { z } from 'zod'

const cotacaoComplementoSchema = z.object({
  complementoId: z.string(),
  grupoComplementoId: z.string(),
  nomeComplemento: z.string(),
  quantidade: z.number(),
  valorUnitario: z.number(),
  valorTotal: z.number(),
  tipoImpactoPreco: z.string(),
})

const cotacaoProdutoSchema = z.object({
  produtoId: z.string(),
  nomeProduto: z.string(),
  quantidade: z.number(),
  valorUnitario: z.number(),
  valorFinal: z.number(),
  complementos: z.array(cotacaoComplementoSchema),
  observacoes: z.array(z.string()),
})

const cotacaoEntregaSchema = z.object({
  enderecoEntrega: z.object({
    id: z.string().optional(),
    etiqueta: z.string(),
    rua: z.string(),
    numero: z.string(),
    bairro: z.string(),
    cidade: z.string().nullable().optional(),
    estado: z.string().nullable().optional(),
    cep: z.string().nullable().optional(),
    complemento: z.string().nullable().optional(),
  }),
  taxaEntrega: z.number(),
})

export const CotacaoPedidoPublicoResponseSchema = z.object({
  tokenCotacao: z.string().min(1),
  expiresAt: z.string(),
  tipoEntrega: z.enum(['entrega', 'retirada']),
  produtos: z.array(cotacaoProdutoSchema),
  subtotalProdutos: z.number(),
  valorFinal: z.number(),
  entrega: cotacaoEntregaSchema.nullable(),
})

export type CotacaoPedidoPublicoDTO = z.infer<typeof CotacaoPedidoPublicoResponseSchema>

export function parseCotacaoPedidoPublicoResponse(raw: unknown): CotacaoPedidoPublicoDTO {
  return CotacaoPedidoPublicoResponseSchema.parse(raw)
}

export function parseCotacaoPedidoPublicoFromErrorBody(raw: unknown): CotacaoPedidoPublicoDTO | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const nested =
    o.cotacao ??
    (o.details && typeof o.details === 'object'
      ? (o.details as Record<string, unknown>).cotacao
      : undefined)
  if (!nested) return null
  try {
    return parseCotacaoPedidoPublicoResponse(nested)
  } catch {
    return null
  }
}
