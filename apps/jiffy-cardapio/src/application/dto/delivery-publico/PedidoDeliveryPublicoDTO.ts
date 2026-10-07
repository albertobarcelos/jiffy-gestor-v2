import { z } from 'zod'

/**
 * Contrato de `GET` e `POST /delivery/pedidos/publico`
 * (`pedidoDeliveryPublicoDTOValidator` do backend).
 */

const geoJsonPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().gte(-180).lte(180),
    z.number().gte(-90).lte(90),
  ]),
})

const statusDeliverySchema = z.enum([
  'PENDENTE',
  'EM_PREPARO',
  'PRONTO',
  'EM_ROTA',
  'FINALIZADO',
  'CANCELADO',
])

const enderecoEntregaPublicoSchema = z.object({
  etiqueta: z.enum(['casa', 'trabalho', 'outro']),
  rua: z.string(),
  numero: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  cep: z.string(),
  complemento: z.string().nullable().optional(),
})

const contextoEntregaPublicoSchema = z.object({
  destinatarioNome: z.string().nullable(),
  destinatarioTelefone: z.string(),
  enderecoEntrega: enderecoEntregaPublicoSchema.nullable(),
  enderecoLocalizacao: geoJsonPointSchema.nullable(),
  localExatoEntrega: geoJsonPointSchema.nullable(),
})

const observacaoLancadaSchema = z.object({
  observacao: z.string(),
  dataLancamento: z.string(),
})

const complementoLancadoPublicoSchema = z.object({
  nomeComplemento: z.string(),
  quantidade: z.number(),
  valorUnitario: z.number(),
  valorFinal: z.number().nullable().optional(),
  tipoImpactoPreco: z.string(),
})

const produtoLancadoPublicoSchema = z.object({
  nomeProduto: z.string(),
  quantidade: z.number(),
  valorUnitario: z.number(),
  valorFinal: z.number(),
  imagemUrl: z.string().nullable(),
  complementos: z.array(complementoLancadoPublicoSchema),
  observacoes: z.array(observacaoLancadaSchema),
})

const cobrancaPublicaSchema = z.object({
  valor: z.number(),
  momentoCobranca: z.enum(['antecipado', 'na_entrega']),
  status: z.enum(['pendente', 'paga', 'cancelada']),
  meioPagamentoNome: z.string(),
  dataCriacao: z.string(),
  dataCancelamento: z.string().nullable(),
})

const empresaPedidoPublicoSchema = z.object({
  nomeFantasia: z.string(),
  slug: z.string(),
  telefone: z.string().nullable(),
  segmento: z.string().nullable(),
  logoUrl: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  exigeCpfVenda: z.boolean(),
  endereco: z
    .object({
      rua: z.string(),
      numero: z.string(),
      bairro: z.string().nullable(),
      cidade: z.string().nullable(),
      estado: z.string().nullable(),
      cep: z.string().nullable(),
    })
    .nullable(),
  localizacao: geoJsonPointSchema.nullable(),
})

export const PedidoDeliveryPublicoResponseSchema = z.object({
  id: z.string().min(1),
  numeroVenda: z.number(),
  codigoVenda: z.string(),
  tipoEntrega: z.enum(['entrega', 'retirada']),
  statusDelivery: statusDeliverySchema,
  tempoTotalEstimadoSegundos: z.number().int().nonnegative().nullable(),
  previsaoEntregaEm: z.string().nullable(),
  documentoCpfCnpj: z.string().nullable(),
  clienteDelivery: z
    .object({
      nome: z.string(),
      telefone: z.string(),
    })
    .nullable(),
  contextoEntrega: contextoEntregaPublicoSchema.nullable(),
  empresa: empresaPedidoPublicoSchema,
  telefoneWhatsapp: z.string().nullable(),
  valorFinal: z.number(),
  taxaEntrega: z.number(),
  troco: z.number(),
  totalPago: z.number(),
  totalFaltaPagar: z.number(),
  dataCriacao: z.string(),
  dataInicioPreparo: z.string().nullable(),
  dataFinalizacaoPreparo: z.string().nullable(),
  dataSaidaEntrega: z.string().nullable(),
  dataFinalizacao: z.string().nullable(),
  dataCancelamento: z.string().nullable(),
  motivoCancelamento: z.string().nullable(),
  sequenciaTransicoes: z.array(
    z.object({
      status: statusDeliverySchema,
      realizadaEm: z.string(),
      ordem: z.number().int().positive(),
    })
  ),
  produtosLancados: z.array(produtoLancadoPublicoSchema),
  cobrancas: z.array(cobrancaPublicaSchema),
  observacoes: z.array(observacaoLancadaSchema),
})

export type PedidoDeliveryPublicoDTO = z.infer<typeof PedidoDeliveryPublicoResponseSchema>

/** Alias do create público: o POST devolve o mesmo DTO do GET. */
export type CreatePedidoPublicoResponseDTO = PedidoDeliveryPublicoDTO

export function parsePedidoDeliveryPublicoResponse(raw: unknown): PedidoDeliveryPublicoDTO {
  const parsed = PedidoDeliveryPublicoResponseSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error('Resposta do pedido inválida. Tente novamente.')
  }
  return parsed.data
}
