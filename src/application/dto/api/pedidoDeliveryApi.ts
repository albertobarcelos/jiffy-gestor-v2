/** Contrato alinhado ao Swagger `CreatePedidoDeliveryRequest` / `PedidoDeliveryResponse`. */

export type TipoEntregaDeliveryApi = 'entrega' | 'retirada'

export type MomentoCobrancaDeliveryApi = 'antecipado' | 'na_entrega'

export type EtiquetaEnderecoDeliveryApi = 'casa' | 'trabalho' | 'outro'

export interface EnderecoClientePedidoDeliveryApi {
  etiqueta: EtiquetaEnderecoDeliveryApi
  rua: string
  numero: string
  bairro: string
  cidade?: string | null
  estado?: string | null
  cep?: string
  complemento?: string | null
}

export interface ClientePedidoDeliveryApi {
  telefone: string
  nome?: string | null
  cpf?: string | null
  /** Endereço já cadastrado do cliente delivery (obrigatório quando há 2+ moradas). */
  enderecoIdEntrega?: string | null
  /** Bootstrap: no máximo 1 item quando o cliente ainda não possui endereços. */
  enderecos?: EnderecoClientePedidoDeliveryApi[]
}

export interface EnderecoEntregaSnapshotApi {
  etiqueta: EtiquetaEnderecoDeliveryApi
  rua: string
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep: string
  complemento?: string | null
  codigoCidadeIbge?: string | null
  codigoEstadoIbge?: string | null
}

export interface ContextoEntregaDeliveryApi {
  clienteDeliveryTelefoneRef?: string | null
  enderecoDeliveryIdRef?: string | null
  destinatarioNome?: string | null
  destinatarioTelefone: string
  destinatarioCpf?: string | null
  enderecoEntrega?: EnderecoEntregaSnapshotApi | null
}

/** PATCH pedido — copiar morada salva ou sobrescrever snapshot manualmente. */
export interface UpdatePedidoEnderecoEntregaApi {
  enderecoDeliveryId?: string
  endereco?: EnderecoEntregaSnapshotApi
}

export interface AtualizarPedidoDeliveryApiRequest {
  observacoes?: string[]
  tipoEntrega?: TipoEntregaDeliveryApi
  enderecoEntrega?: UpdatePedidoEnderecoEntregaApi
  taxas?: AtualizarTaxasPedidoDeliveryApi['taxas']
  cobrancas?: AtualizarCobrancasPedidoDeliveryApi['cobrancas']
}

export interface ComplementoProdutoPedidoDeliveryApi {
  complementoId: string
  grupoComplementoId: string
  quantidade: number
}

export interface ProdutoPedidoDeliveryApi {
  produtoId: string
  quantidade: number
  tipoDesconto?: 'porcentagem' | 'fixo' | null
  valorDesconto?: number | null
  tipoAcrescimo?: 'porcentagem' | 'fixo' | null
  valorAcrescimo?: number | null
  observacoes?: string[]
  complementos?: ComplementoProdutoPedidoDeliveryApi[]
}

export interface CobrancaPedidoDeliveryApi {
  meioPagamentoId: string
  valor: number
  momentoCobranca: MomentoCobrancaDeliveryApi
  pagamentoEfetivado?: { confirmar: true } | null
}

export interface CancelaCobrancaPedidoDeliveryApi {
  cobrancaId: string
}

export interface ConfirmaCobrancaPedidoDeliveryApi {
  cobrancaId: string
}

export interface AtualizarCobrancasPedidoDeliveryApi {
  cobrancas: {
    add?: CobrancaPedidoDeliveryApi[]
    cancel?: CancelaCobrancaPedidoDeliveryApi[]
    confirm?: ConfirmaCobrancaPedidoDeliveryApi[]
  }
}

export interface TaxaPedidoDeliveryApi {
  taxaId: string
  quantidade?: number
}

/** PATCH pedido — adiciona/remove taxas (remove usa o `taxaId` do catálogo). */
export interface AtualizarTaxasPedidoDeliveryApi {
  taxas: {
    add?: TaxaPedidoDeliveryApi[]
    remove?: string[]
  }
}

/**
 * PATCH atômico para "Salvar Taxa" no Kanban: ajusta a taxa e, quando há cobrança
 * pendente `na_entrega`, reemite a cobrança com o novo valor (cancel + add).
 */
export interface SalvarTaxaPedidoDeliveryApi {
  taxas?: AtualizarTaxasPedidoDeliveryApi['taxas']
  cobrancas?: AtualizarCobrancasPedidoDeliveryApi['cobrancas']
}

export interface CriarPedidoDeliveryApiRequest {
  origem: 'GESTOR' | 'JIFFY_DELIVERY'
  tipoEntrega: TipoEntregaDeliveryApi
  cliente: ClientePedidoDeliveryApi
  produtos: ProdutoPedidoDeliveryApi[]
  tipoVenda?: string
  entregadorId?: string | null
  /** `imediato` | `agendado` — omitido = imediato (compat). */
  modoTempo?: 'imediato' | 'agendado'
  /** ISO datetime — obrigatório se `modoTempo === 'agendado'`. */
  slotInicio?: string
  slotFim?: string
  tempoTotalEstimadoSegundos?: number | null
  observacoes?: string[]
  cobrancas?: CobrancaPedidoDeliveryApi[]
  taxas?: TaxaPedidoDeliveryApi[]
  documentoCpfCnpj?: string | null
}

export interface PedidoDeliveryApiResponse {
  id?: string
  statusDelivery?: string
  numeroVenda?: number
  codigoVenda?: string
  dataUltimaModificacao?: string | null
  dataFinalizacao?: string | null
  contextoEntrega?: ContextoEntregaDeliveryApi | null
}

export type StatusDeliveryApi =
  | 'PENDENTE'
  | 'EM_PREPARO'
  | 'PRONTO'
  | 'EM_ROTA'
  | 'FINALIZADO'
  | 'CANCELADO'

export interface TransicaoPedidoDeliveryApiRequest {
  toStatus: StatusDeliveryApi
  motivoCancelamento?: string
}
