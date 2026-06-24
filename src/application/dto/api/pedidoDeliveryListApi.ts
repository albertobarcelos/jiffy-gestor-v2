/**
 * Contrato GET /api/v1/delivery/pedidos (listagem paginada).
 *
 * Espelha `vendaDeliverySummaryDTOValidator` e `findManyVendaDeliveryDTOValidator`
 * do backend (`modules/delivery/application/dtos/validators.ts`).
 *
 * ---
 * Mapeamento implementado em `PedidoDeliveryListMapper.ts` (Fase 2).
 *
 * | Summary API              | VendaUnificadaDTO              | Observação |
 * |--------------------------|--------------------------------|------------|
 * | id                       | id                             |            |
 * | numeroVenda              | numeroVenda                    |            |
 * | codigoVenda              | codigoVenda                    |            |
 * | tipoEntrega              | tipoVenda                      | usar entrega/retirada; ignorar `tipoVenda: "delivery"` da API |
 * | origem                   | origem                         | GESTOR→GESTOR; JIFFY_DELIVERY→GESTOR (filtro por origem na API) |
 * | (fixo)                   | tabelaOrigem                   | sempre `'venda_gestor'` |
 * | statusDelivery           | statusEtapaOperacional         | PENDENTE→NOVOS_PEDIDOS, EM_PREPARO, PRONTO→PRONTO_ENTREGA, EM_ROTA, FINALIZADO→regras fiscais |
 * | valorFinal               | valorFinal                     |            |
 * | totalFaltaPagar          | statusFinanceiro               | ≤0→pago; >0→pendente |
 * | dataCriacao              | dataCriacao                    |            |
 * | dataFinalizacao          | dataFinalizacao                |            |
 * | dataCancelamento         | dataCancelamento               |            |
 * | dataUltimaModificacao    | dataUltimaModificacao          |            |
 * | cliente                  | cliente                        |            |
 * | solicitarEmissaoFiscal   | solicitarEmissaoFiscal         |            |
 * | resumoFiscal.status      | statusFiscal                   | UPPER |
 * | resumoFiscal.documentoFiscalId | documentoFiscalId      |            |
 * | resumoFiscal.numero      | numeroFiscal                   |            |
 * | resumoFiscal.serie       | serieFiscal                    |            |
 * | resumoFiscal.dataEmissao | dataEmissaoFiscal              |            |
 * | resumoFiscal.modelo      | modelo / tipoDocFiscal         | 55→NFE, 65→NFCE |
 * | resumoFiscal.retornoSefaz| retornoSefaz                   |            |
 * | entregador               | entregador                     | id, nome, telefone |
 * | contextoEntrega          | contextoEntrega                | endereço no card (sem GET) |
 * | cobrancas (summary)      | cobrancasDelivery              | enxuto: id, valor, meioPagamentoId, momentoCobranca, status, datas |
 *
 * Campos ausentes na listagem (defaults no mapper): abertoPor, totalDesconto, totalAcrescimo, numeroMesa.
 */

import type {
  ContextoEntregaDeliveryApi,
  MomentoCobrancaDeliveryApi,
  StatusDeliveryApi,
  TipoEntregaDeliveryApi,
} from '@/src/application/dto/api/pedidoDeliveryApi'

export interface ObservacaoPedidoDeliverySummaryApi {
  observacao: string
  dataLancamento?: string
}

/** Valores persistidos em `origem` no módulo delivery (`OrigemVendaExterna`). */
export type OrigemPedidoDeliveryApi = 'GESTOR' | 'JIFFY_DELIVERY'

export interface AtorPedidoDeliverySummaryApi {
  id: string
  nome?: string | null
}

export type CobrancaPedidoDeliveryStatusApi = 'pendente' | 'paga' | 'cancelada'

/** Cobrança enxuta no summary — sem criadaPor, canceladaPor ou pagamentoEfetivado. */
export interface CobrancaPedidoDeliverySummaryApi {
  id: string
  valor: number
  meioPagamentoId: string
  momentoCobranca: MomentoCobrancaDeliveryApi
  status: CobrancaPedidoDeliveryStatusApi
  dataCriacao: string
  dataCancelamento?: string | null
}

export interface EntregadorPedidoDeliverySummaryApi {
  id: string
  nome: string | null
  telefone: string | null
}

/** Contexto de entrega no summary — suficiente para exibir endereço no card/painel. */
export type ContextoEntregaPedidoDeliverySummaryApi = ContextoEntregaDeliveryApi

export interface ResumoFiscalPedidoDeliverySummaryApi {
  id: string
  status: string
  numero: number | null
  retornoSefaz: string | null
  codigoRetorno: string | null
  serie: string | null
  dataEmissao: string | null
  modelo: number
  documentoFiscalId: string | null
  chaveFiscal: string | null
  empresaId: string
  vendaId: string
  terminalId: string | null
  dataCriacao: string
  dataUltimaModificacao: string
}

export interface ClientePedidoDeliverySummaryApi {
  id: string
  nome: string
}

/** Item da listagem — `VendaDeliverySummaryDTO` serializado (datas ISO). */
export interface PedidoDeliverySummaryApi {
  id: string
  numeroVenda: number
  codigoVenda: string
  /** Valor fixo `"delivery"` no backend; não usar no card — preferir `tipoEntrega`. */
  tipoVenda: string
  tipoEntrega: TipoEntregaDeliveryApi
  tempoTotalEstimadoSegundos: number | null
  previsaoEntregaEm: string | null
  origem: OrigemPedidoDeliveryApi | string
  statusDelivery: StatusDeliveryApi
  valorFinal: number
  troco: number
  totalPago: number
  totalFaltaPagar: number
  totalCobrancasCriadas: number
  totalCobrancasNaoEfetivadas: number
  dataCriacao: string
  dataInicioPreparo: string | null
  dataFinalizacaoPreparo: string | null
  dataSaidaEntrega: string | null
  dataFinalizacao: string | null
  dataUltimaModificacao: string
  dataUltimoProdutoLancado: string
  dataCancelamento: string | null
  cliente: ClientePedidoDeliverySummaryApi | null
  solicitarEmissaoFiscal: boolean
  cobrancas: CobrancaPedidoDeliverySummaryApi[]
  resumoFiscal: ResumoFiscalPedidoDeliverySummaryApi | null
  observacoes?: ObservacaoPedidoDeliverySummaryApi[]
  entregador?: EntregadorPedidoDeliverySummaryApi | null
  contextoEntrega?: ContextoEntregaPedidoDeliverySummaryApi | null
}

/**
 * Query params alinhados a `PaginationValidator` + `vendaDeliveryFilterOptionsValidator`.
 * Datas em ISO 8601 (coerção no backend via `z.coerce.date()`).
 */
export interface PedidosDeliveryQueryParams {
  offset?: number
  limit?: number
  q?: string
  statusDelivery?: StatusDeliveryApi | StatusDeliveryApi[]
  tipoEntrega?: TipoEntregaDeliveryApi | TipoEntregaDeliveryApi[]
  origem?: OrigemPedidoDeliveryApi | OrigemPedidoDeliveryApi[]
  solicitarEmissaoFiscal?: boolean
  cancelado?: boolean
  dataCriacaoInicial?: string
  dataCriacaoFinal?: string
  dataFinalizacaoInicial?: string
  dataFinalizacaoFinal?: string
  /** Filtro delta: retorna apenas itens com `dataUltimaModificacao >= valor`. Usado no re-poll do Kanban. */
  dataUltimaModificacaoInicial?: string
}

/** Resposta de `GET /api/v1/delivery/pedidos/contagem-por-status`. */
export interface PedidosDeliveryContagemPorStatusResponse {
  PENDENTE: number
  EM_PREPARO: number
  PRONTO: number
  EM_ROTA: number
  FINALIZADO: number
  CANCELADO: number
  total: number
}

export const PEDIDOS_DELIVERY_CONTAGEM_POR_STATUS_VAZIA: PedidosDeliveryContagemPorStatusResponse = {
  PENDENTE: 0,
  EM_PREPARO: 0,
  PRONTO: 0,
  EM_ROTA: 0,
  FINALIZADO: 0,
  CANCELADO: 0,
  total: 0,
}

/** Resposta paginada — `PaginationResult<VendaDeliverySummaryDTO>`. */
export interface PedidosDeliveryListResponse {
  count: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
  items: PedidoDeliverySummaryApi[]
}

/** Tamanho de página no Kanban (listagem global e expansão por coluna ao rolar). */
export const PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE = 10

/**
 * Tamanho da carga inicial do Kanban delivery (sync otimizado).
 * Cobre a grande maioria dos restaurantes em 1 requisição.
 */
export const KANBAN_DELIVERY_SYNC_PAGE_SIZE = 100

/** Pedidos por coluna no Kanban delivery (scroll incremental por status). */
export const KANBAN_DELIVERY_COLUMN_PAGE_SIZE = 15
