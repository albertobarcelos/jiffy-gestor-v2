import { z } from 'zod'

export const CheckoutPagamentoItemSchema = z.object({
  meioPagamentoId: z.string().min(1),
  valor: z.number().positive(),
})

export const EnderecoFormPublicoSchema = z.object({
  rua: z.string(),
  numero: z.string(),
  bairro: z.string(),
  cidade: z.string(),
  estado: z.string(),
  cep: z.string().optional(),
  complemento: z.string().optional(),
  pontoReferencia: z.string().optional(),
  etiqueta: z.enum(['casa', 'trabalho', 'outro']).optional(),
})

export const PedidoPublicoCarrinhoItemInputSchema = z.object({
  produtoId: z.string().min(1),
  quantidade: z.number().positive(),
  observacoes: z.array(z.string()),
  complementos: z.array(
    z.object({
      complementoId: z.string().min(1),
      grupoComplementoId: z.string().min(1),
      quantidade: z.number().positive(),
    })
  ),
})

export const CheckoutFormDataSchema = z.object({
  tipoEntrega: z.enum(['entrega', 'retirada']),
  telefone: z.string(),
  telefonePaisIso2: z.string().min(2),
  nome: z.string(),
  modoEndereco: z.enum(['existente', 'novo']),
  enderecoIdSelecionado: z.string(),
  rua: z.string(),
  numero: z.string(),
  bairro: z.string(),
  cidade: z.string(),
  estado: z.string(),
  cep: z.string(),
  complemento: z.string(),
  pontoReferencia: z.string(),
  etiquetaEndereco: z.enum(['casa', 'trabalho', 'outro']),
  apelidoEndereco: z.string(),
  pagamentos: z.array(CheckoutPagamentoItemSchema),
  observacaoPedido: z.string(),
  cpfNotaFiscal: z.string(),
  /** Timing do pedido (step "Quando?"). Vazio até escolher na etapa de recebimento. */
  modoTempo: z.union([z.enum(['imediato', 'agendado']), z.literal('')]),
  slotInicio: z.string(),
  slotFim: z.string(),
  /** Label amigável da janela (só UI / revisão). */
  slotLabel: z.string(),
})

export type CheckoutPagamentoItem = z.infer<typeof CheckoutPagamentoItemSchema>
export type EnderecoFormPublico = z.infer<typeof EnderecoFormPublicoSchema>
export type PedidoPublicoCarrinhoItemInput = z.infer<
  typeof PedidoPublicoCarrinhoItemInputSchema
>
export type CheckoutFormData = z.infer<typeof CheckoutFormDataSchema>
