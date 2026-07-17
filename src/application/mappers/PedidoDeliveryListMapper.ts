import type {
  PedidoDeliverySummaryApi,
  PedidosDeliveryListResponse,
} from '@/src/application/dto/api/pedidoDeliveryListApi'
import { derivarFluxoPagamentoEntregaDeliverySummary } from '@/src/application/mappers/DeliveryFluxoPagamentoMapper'
import {
  mapItemJsonParaVendaUnificadaDTO,
  type VendaUnificadaDTO,
} from '@/features/kanban/hooks/useVendasUnificadas'

/** Origem comercial no card Kanban (`VendaUnificadaDTO.origem`). */
export function mapOrigemApiDeliveryParaVendaUnificada(
  origem: string | null | undefined
): VendaUnificadaDTO['origem'] {
  const o = String(origem ?? '').trim().toUpperCase()
  if (o === 'GESTOR' || o === 'JIFFY_DELIVERY') return 'GESTOR'
  return 'GESTOR'
}

/** Deriva status financeiro a partir do summary delivery (Kanban / badge pagamento). */
export function derivarStatusFinanceiroDeliverySummary(
  totalFaltaPagar: number,
  totalPago: number,
  cobrancas?: PedidoDeliverySummaryApi['cobrancas']
): string {
  if (Number.isFinite(totalFaltaPagar) && totalFaltaPagar <= 0) return 'pago'

  const lista = Array.isArray(cobrancas) ? cobrancas : []
  const temPaga = lista.some(c => c.status === 'paga')
  const temPendente = lista.some(c => c.status === 'pendente')
  if (temPaga && temPendente) return 'parcial'
  if (totalPago > 0 && totalFaltaPagar > 0) return 'parcial'

  return 'pendente'
}

function resolverTipoDocFiscal(modelo: number | null | undefined): 'NFE' | 'NFCE' | null {
  if (modelo === 55) return 'NFE'
  if (modelo === 65) return 'NFCE'
  return null
}

/**
 * Monta record compatível com `mapItemJsonParaVendaUnificadaDTO` (GET unificado).
 * `tipoEntrega` vira `tipoVenda`; ignora `tipoVenda: "delivery"` do backend.
 */
export function pedidoDeliverySummaryParaUnifiedRecord(
  summary: PedidoDeliverySummaryApi
): Record<string, unknown> {
  const resumoFiscal = summary.resumoFiscal

  return {
    id: summary.id,
    numeroVenda: summary.numeroVenda,
    codigoVenda: summary.codigoVenda,
    tipoVenda: summary.tipoEntrega,
    origem: mapOrigemApiDeliveryParaVendaUnificada(summary.origem),
    tabelaOrigem: 'venda_gestor',
    valorFinal: summary.valorFinal,
    totalDesconto: 0,
    totalAcrescimo: 0,
    dataCriacao: summary.dataCriacao,
    dataFinalizacao: summary.dataFinalizacao,
    dataCancelamento: summary.dataCancelamento,
    cliente: summary.cliente,
    solicitarEmissaoFiscal: summary.solicitarEmissaoFiscal,
    statusFiscal: resumoFiscal?.status ?? null,
    resumoFiscal,
    documentoFiscalId: resumoFiscal?.documentoFiscalId ?? null,
    abertoPor: { id: '', nome: '—' },
    numeroFiscal: resumoFiscal?.numero ?? null,
    serieFiscal: resumoFiscal?.serie ?? null,
    dataEmissaoFiscal: resumoFiscal?.dataEmissao ?? null,
    modelo: resumoFiscal?.modelo ?? null,
    tipoDocFiscal: resolverTipoDocFiscal(resumoFiscal?.modelo),
    retornoSefaz: resumoFiscal?.retornoSefaz ?? null,
    statusDelivery: summary.statusDelivery,
    statusEtapaOperacional: summary.statusDelivery,
    dataUltimaModificacao: summary.dataUltimaModificacao,
    totalFaltaPagar: summary.totalFaltaPagar,
    totalPago: summary.totalPago,
    statusFinanceiro: derivarStatusFinanceiroDeliverySummary(
      summary.totalFaltaPagar,
      summary.totalPago,
      summary.cobrancas
    ),
    previsaoEntregaEm: summary.previsaoEntregaEm,
    tempoTotalEstimadoSegundos: summary.tempoTotalEstimadoSegundos,
    pedidoAgendado: summary.pedidoAgendado === true,
    slotInicio: summary.slotInicio ?? null,
    slotFim: summary.slotFim ?? null,
    fluxoPagamentoEntrega: derivarFluxoPagamentoEntregaDeliverySummary(
      summary.totalFaltaPagar,
      summary.cobrancas
    ),
    cobrancas: summary.cobrancas,
    observacoes: summary.observacoes,
    entregador: summary.entregador ?? null,
    contextoEntrega: summary.contextoEntrega ?? null,
  }
}

/** Summary delivery → DTO do Kanban fiscal. */
export function mapPedidoDeliverySummaryParaVendaUnificadaDTO(
  summary: PedidoDeliverySummaryApi
): VendaUnificadaDTO {
  return mapItemJsonParaVendaUnificadaDTO(pedidoDeliverySummaryParaUnifiedRecord(summary))
}

export function mapPedidosDeliverySummariesParaVendaUnificadaDTO(
  items: PedidoDeliverySummaryApi[]
): VendaUnificadaDTO[] {
  return items.map(mapPedidoDeliverySummaryParaVendaUnificadaDTO)
}

function parseNumero(raw: unknown, fallback: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function parseBoolean(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === 'boolean') return raw
  return fallback
}

/** Normaliza item bruto da API (tolerante a campos opcionais). */
export function normalizarPedidoDeliverySummaryJson(raw: unknown): PedidoDeliverySummaryApi | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? '').trim()
  if (!id) return null

  const tipoEntregaRaw = String(o.tipoEntrega ?? 'entrega').trim().toLowerCase()
  const tipoEntrega =
    tipoEntregaRaw === 'retirada' ? ('retirada' as const) : ('entrega' as const)

  const statusRaw = String(o.statusDelivery ?? 'PENDENTE').trim().toUpperCase()
  const statusDelivery = (
    ['PENDENTE', 'EM_PREPARO', 'PRONTO', 'EM_ROTA', 'FINALIZADO', 'CANCELADO'] as const
  ).includes(statusRaw as PedidoDeliverySummaryApi['statusDelivery'])
    ? (statusRaw as PedidoDeliverySummaryApi['statusDelivery'])
    : 'PENDENTE'

  const clienteRaw =
    o.cliente && typeof o.cliente === 'object' && !Array.isArray(o.cliente)
      ? (o.cliente as Record<string, unknown>)
      : null
  const cliente =
    clienteRaw && String(clienteRaw.id ?? '').trim()
      ? {
          id: String(clienteRaw.id),
          nome: String(clienteRaw.nome ?? ''),
        }
      : null

  const cobrancas = Array.isArray(o.cobrancas)
    ? (o.cobrancas as PedidoDeliverySummaryApi['cobrancas'])
    : []

  const resumoFiscalRaw =
    o.resumoFiscal && typeof o.resumoFiscal === 'object' && !Array.isArray(o.resumoFiscal)
      ? (o.resumoFiscal as PedidoDeliverySummaryApi['resumoFiscal'])
      : null

  const observacoes = Array.isArray(o.observacoes)
    ? (o.observacoes as PedidoDeliverySummaryApi['observacoes'])
    : []

  const entregadorRaw =
    o.entregador && typeof o.entregador === 'object' && !Array.isArray(o.entregador)
      ? (o.entregador as Record<string, unknown>)
      : null
  const entregador =
    entregadorRaw && String(entregadorRaw.id ?? '').trim()
      ? {
          id: String(entregadorRaw.id),
          nome: entregadorRaw.nome != null ? String(entregadorRaw.nome) : null,
          telefone: entregadorRaw.telefone != null ? String(entregadorRaw.telefone) : null,
        }
      : null

  const contextoEntregaRaw =
    o.contextoEntrega && typeof o.contextoEntrega === 'object' && !Array.isArray(o.contextoEntrega)
      ? (o.contextoEntrega as PedidoDeliverySummaryApi['contextoEntrega'])
      : null

  return {
    id,
    numeroVenda: parseNumero(o.numeroVenda, 0),
    codigoVenda: String(o.codigoVenda ?? ''),
    tipoVenda: String(o.tipoVenda ?? 'delivery'),
    tipoEntrega,
    tempoTotalEstimadoSegundos:
      o.tempoTotalEstimadoSegundos == null ? null : parseNumero(o.tempoTotalEstimadoSegundos, 0),
    previsaoEntregaEm: o.previsaoEntregaEm != null ? String(o.previsaoEntregaEm) : null,
    pedidoAgendado: o.pedidoAgendado === true,
    slotInicio: o.slotInicio != null ? String(o.slotInicio) : null,
    slotFim: o.slotFim != null ? String(o.slotFim) : null,
    origem: String(o.origem ?? 'GESTOR'),
    statusDelivery,
    valorFinal: parseNumero(o.valorFinal, 0),
    troco: parseNumero(o.troco, 0),
    totalPago: parseNumero(o.totalPago, 0),
    totalFaltaPagar: parseNumero(o.totalFaltaPagar, 0),
    totalCobrancasCriadas: parseNumero(o.totalCobrancasCriadas, 0),
    totalCobrancasNaoEfetivadas: parseNumero(o.totalCobrancasNaoEfetivadas, 0),
    dataCriacao: String(o.dataCriacao ?? ''),
    dataInicioPreparo: o.dataInicioPreparo != null ? String(o.dataInicioPreparo) : null,
    dataFinalizacaoPreparo:
      o.dataFinalizacaoPreparo != null ? String(o.dataFinalizacaoPreparo) : null,
    dataSaidaEntrega: o.dataSaidaEntrega != null ? String(o.dataSaidaEntrega) : null,
    dataFinalizacao: o.dataFinalizacao != null ? String(o.dataFinalizacao) : null,
    dataUltimaModificacao: String(o.dataUltimaModificacao ?? o.dataCriacao ?? ''),
    dataUltimoProdutoLancado: String(o.dataUltimoProdutoLancado ?? o.dataCriacao ?? ''),
    dataCancelamento: o.dataCancelamento != null ? String(o.dataCancelamento) : null,
    cliente,
    solicitarEmissaoFiscal:
      typeof o.solicitarEmissaoFiscal === 'boolean' ? o.solicitarEmissaoFiscal : false,
    cobrancas,
    resumoFiscal: resumoFiscalRaw,
    observacoes,
    entregador,
    contextoEntrega: contextoEntregaRaw,
  }
}

/** Normaliza resposta paginada GET /delivery/pedidos. */
export function normalizarPedidosDeliveryListResponse(raw: unknown): PedidosDeliveryListResponse {
  const vazio: PedidosDeliveryListResponse = {
    count: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
    items: [],
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return vazio
  const o = raw as Record<string, unknown>

  const itemsRaw = Array.isArray(o.items) ? o.items : []
  const items = itemsRaw
    .map(item => normalizarPedidoDeliverySummaryJson(item))
    .filter((item): item is PedidoDeliverySummaryApi => item != null)

  const limit = parseNumero(o.limit, items.length || 50)

  return {
    count: parseNumero(o.count, items.length),
    page: parseNumero(o.page, 1),
    limit,
    totalPages: parseNumero(o.totalPages, 0),
    hasNext: parseBoolean(o.hasNext, false),
    hasPrevious: parseBoolean(o.hasPrevious, false),
    items,
  }
}

export type PedidosDeliveryListVendaUnificadaResponse = Omit<
  PedidosDeliveryListResponse,
  'items'
> & { items: VendaUnificadaDTO[] }

export function mapPedidosDeliveryListResponseParaVendaUnificadaDTO(
  response: PedidosDeliveryListResponse
): PedidosDeliveryListVendaUnificadaResponse {
  return {
    ...response,
    items: mapPedidosDeliverySummariesParaVendaUnificadaDTO(response.items),
  }
}
