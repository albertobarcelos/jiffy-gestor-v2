import type { ModoImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'

/** Cupom agrupado pelo backend (`GET .../vendas/{id}/tickets`). */
export type TicketTipoCupomApi = 'unificado' | 'producao' | 'expedicao'

export type VendaGestorTicketWarning =
  | {
      code: string
      message: string
      detalhe?: string
      contexto?: Record<string, unknown>
    }
  | string

export interface VendaGestorTicketItemComplemento {
  nome?: string
  descricao?: string
  quantidade?: number
  /** Dados calculados apenas para impressão; não devem alterar a montagem fiscal da venda. */
  impressao?: {
    quantidade?: number
    valorUnitario?: number
    valorFinal?: number
    valorTotal?: number
  }
}

/** Item de linha dentro de um ticket (contrato API delivery tickets). */
export interface VendaGestorTicketItem {
  produtoLancadoId?: string
  produtoId?: string
  nomeProduto?: string
  quantidade?: number
  /** Algumas APIs enviam estrutura alternativa — tratamos em runtime. */
  quantidades?: unknown
  valorUnitario?: number
  valorFinal?: number
  valorTotal?: number
  observacao?: string
  complementos?: VendaGestorTicketItemComplemento[]
}

export interface VendaGestorTicket {
  ticketId?: string
  tipoCupom: TicketTipoCupomApi
  impressoraId: string | null
  /** Nome lógico/cadastral, apenas exibição. */
  impressoraNome: string | null
  impressora?: {
    id?: string | null
    nome?: string | null
    /** Nome local do Windows resolvido pelo backend via estação de impressão. */
    nomeImpressoraWindows?: string | null
    mapeamentoEncontrado?: boolean
    origem?: string | null
  } | null
  /** Campo legado tolerado durante a transição do contrato. */
  nomeImpressoraWindows?: string | null
  copias: number
  itens: VendaGestorTicketItem[]
}

export interface VendaGestorTicketsRastreamento {
  geradoEm?: string
  empresaId?: string
  vendaId?: string
  codigoVenda?: string
  numeroVenda?: number
  modoImpressaoDelivery?: ModoImpressaoDelivery
  estacaoImpressaoId?: string | null
  estacaoImpressaoNome?: string | null
}

export interface VendaGestorTicketsCliente {
  id?: string
  nome?: string
  telefone?: string
  celular?: string
}

export interface VendaGestorTicketsEndereco {
  logradouro?: string
  rua?: string
  numero?: string | number
  complemento?: string
  bairro?: string
  cidade?: string
  municipio?: string
  estado?: string
  uf?: string
  cep?: string
  referencia?: string
  pontoReferencia?: string
}

export interface VendaGestorTicketsEntregador {
  id?: string
  usuarioId?: string
  nome?: string
  telefone?: string
  tipoUsuario?: 'entregador' | string
}

export interface VendaGestorTicketsUsuarioPedido {
  id?: string
  usuarioId?: string
  nome?: string
  tipoUsuario?: string
}

export type VendaGestorPagamentoStatus = 'pendente' | 'parcial' | 'pago'

export interface VendaGestorTicketsPagamentoMeio {
  nome?: string
  tipo?: string
  valor?: number
}

export interface VendaGestorTicketsPagamento {
  status?: VendaGestorPagamentoStatus | string
  cobrarCliente?: boolean
  meioPagamento?: string
  formaPagamento?: string
  /** Valor que o entregador deve cobrar do cliente na entrega. */
  valorCobrarNaEntrega?: number
  /** Valor de troco que o entregador deve levar para o cliente. */
  trocoParaLevar?: number
  valorReceber?: number
  valorRecebido?: number
  valorFaltante?: number
  meios?: VendaGestorTicketsPagamentoMeio[]
}

export interface VendaGestorTicketsResumoPedido {
  valorItens?: number
  valorAdicionais?: number
  taxaEntrega?: number
  valorTotal?: number
}

export interface VendaGestorTicketsEmpresa {
  nome?: string
  nomeExibicao?: string
  razaoSocial?: string
  cnpj?: string
  telefone?: string
}

/**
 * Resposta de `GET /api/v1/gestor/vendas/{id}/tickets`.
 * Campos opcionais toleram evolução do backend.
 */
export interface VendaGestorTicketsResponse {
  rastreamento?: VendaGestorTicketsRastreamento
  vendaId: string
  estacaoImpressaoId?: string | null
  codigoVenda?: string
  numeroVenda: number
  tipoVenda?: string | null
  dataPedido: string
  dataPrevista: string
  tiradoPor?: VendaGestorTicketsUsuarioPedido | null
  entregador?: VendaGestorTicketsEntregador | string | null
  statusOperacional?: string
  cliente?: VendaGestorTicketsCliente | null
  observacaoPedido?: string
  enderecoEntrega?: string | VendaGestorTicketsEndereco | Record<string, unknown> | null
  valorFinal: number
  resumoPedido?: VendaGestorTicketsResumoPedido | null
  pagamento?: VendaGestorTicketsPagamento | null
  empresa?: VendaGestorTicketsEmpresa | null
  modoImpressaoDelivery?: ModoImpressaoDelivery
  copiasCupomUnificado?: number
  imprimirAoReceber?: boolean
  imprimirAoFicarPronto?: boolean
  tickets: VendaGestorTicket[]
  warnings?: VendaGestorTicketWarning[]
}
