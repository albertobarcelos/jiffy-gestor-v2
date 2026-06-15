/** Contratos HTTP com o backend de venda gestor (borda application/infrastructure). */

export interface ProdutoLancadoApiItem {
  produtoId?: string
  quantidade?: number
  valorUnitario?: number
  valorFinal?: number
  nomeProduto?: string
  nome?: string
  tipoDesconto?: string | null
  valorDesconto?: number | string | null
  tipoAcrescimo?: string | null
  valorAcrescimo?: number | string | null
  complementos?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export interface PagamentoApiItem {
  id?: string
  meioPagamentoId?: string
  meio_pagamento_id?: string
  valor?: number
  cobrarNaEntrega?: boolean
  efetivado?: boolean
  naoEfetivo?: boolean
  cancelado?: boolean
  isTefUsed?: boolean
  is_tef_used?: boolean
  [key: string]: unknown
}

/** Resposta bruta GET venda gestor/PDV (campos usados pelos mappers). */
export interface VendaGestorApiResponse {
  id?: string
  vendaId?: string
  origem?: string | null
  statusVenda?: string | null
  statusFiscal?: string | null
  dataFinalizacao?: string | null
  dataCancelamento?: string | null
  tipoVenda?: string | null
  valorFinal?: number | string | null
  produtosLancados?: ProdutoLancadoApiItem[]
  produtos?: ProdutoLancadoApiItem[]
  pagamentos?: PagamentoApiItem[]
  fiscal?: Record<string, unknown> | null
  resumoFiscal?: Record<string, unknown> | null
  [key: string]: unknown
}

export interface CriarVendaGestorPagamentoApi {
  status?: string
  cobrarCliente?: boolean
  meioPagamentoId?: string
  meioPagamento?: string | null
  valorReceber?: number
  valorRecebido?: number
  valorFaltante?: number
  trocoPara?: number
  meios?: Array<{
    meioPagamentoId: string
    nome: string
    valor: number
  }>
}

export interface CriarVendaGestorApiRequest {
  tipoVenda: string
  origem: string
  statusVenda: string
  valorFinal: number
  totalDesconto: number
  totalAcrescimo: number
  produtosLancados: unknown[]
  /** compat backend — remover quando API aceitar uma chave */
  produtos: unknown[]
  tipoAtendimento?: string
  modalidadeEntrega?: string
  tempoPrevistoMinutos?: number
  taxaEntregaId?: string
  taxaEntregaValor?: number
  taxasLancadas?: Array<{ taxaId: string; valorCalculado: number }>
  solicitarEmissaoFiscal?: boolean
  clienteId?: string
  enderecoEntrega?: MoradaEntregaSelecionadaApi['endereco']
  dataFinalizacao?: string
  pagamentos?: unknown[]
  pagamento?: CriarVendaGestorPagamentoApi
  observacoes?: string[]
}

export interface MoradaEntregaSelecionadaApi {
  endereco?: {
    cep?: string
    rua?: string
    numero?: string
    bairro?: string
    cidade?: string
    estado?: string
    complemento?: string
    referencia?: string
  }
}

export interface CriarVendaGestorApiResponse {
  id?: string
  vendaId?: string
  data?: {
    id?: string
    vendaId?: string
  }
}
