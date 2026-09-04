import { z } from 'zod'

/** Alinhado ao `cotacaoEntregaDTOValidator` do backend (homolog). */
const geoJsonPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
})

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
  enderecoId: z.string().nullable(),
  taxaEntrega: z.number(),
  enderecoLocalizacao: geoJsonPointSchema,
  preferenciaEntrega: geoJsonPointSchema.nullable().optional(),
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

function mensagemErroParseCotacao(error: z.ZodError): string {
  const paths = error.issues.map(i => i.path.join('.')).filter(Boolean)
  if (paths.some(p => p.startsWith('entrega'))) {
    return 'Resposta de cotação inválida (dados de entrega). Tente novamente.'
  }
  return 'Resposta de cotação inválida. Tente novamente.'
}

export function parseCotacaoPedidoPublicoResponse(raw: unknown): CotacaoPedidoPublicoDTO {
  const parsed = CotacaoPedidoPublicoResponseSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(mensagemErroParseCotacao(parsed.error))
  }
  return parsed.data
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
