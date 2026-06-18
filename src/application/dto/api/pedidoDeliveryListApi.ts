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
 *
 * Campos ausentes na listagem (defaults no mapper): entregador,
 * contextoEntrega, abertoPor, totalDesconto, totalAcrescimo, numeroMesa.
 */

import type {
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

export interface CobrancaPedidoDeliverySummaryApi {
  id: string
  valor: number
  meioPagamentoId: string
  momentoCobranca: MomentoCobrancaDeliveryApi
  status: CobrancaPedidoDeliveryStatusApi
  criadaPor: AtorPedidoDeliverySummaryApi
  canceladaPor?: AtorPedidoDeliverySummaryApi | null
  dataCriacao: string
  dataCancelamento?: string | null
  pagamentoEfetivado?: Record<string, unknown> | null
}

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

/** Tamanho de página no Kanban delivery (espelha `VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE`). */
export const PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE = 50
