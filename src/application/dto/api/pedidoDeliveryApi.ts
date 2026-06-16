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
  enderecos?: EnderecoClientePedidoDeliveryApi[]
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

export interface AtualizarCobrancasPedidoDeliveryApi {
  cobrancas: {
    add?: CobrancaPedidoDeliveryApi[]
    cancel?: CancelaCobrancaPedidoDeliveryApi[]
  }
}

export interface TaxaPedidoDeliveryApi {
  taxaId: string
  quantidade?: number
}

export interface CriarPedidoDeliveryApiRequest {
  origem: 'GESTOR' | 'JIFFY_DELIVERY'
  tipoEntrega: TipoEntregaDeliveryApi
  cliente: ClientePedidoDeliveryApi
  produtos: ProdutoPedidoDeliveryApi[]
  tipoVenda?: string
  entregadorId?: string | null
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
