import {
  keepPreviousData,
  type InfiniteData,
} from '@tanstack/react-query'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import {
  isPedidoEntregaKanban,
} from '@/src/shared/helpers/pedidoEntregaKanban'
import type { FluxoPagamentoEntrega } from '@/src/domain/types/vendaDetalhe'
import type { ContextoEntregaDeliveryApi } from '@/src/application/dto/api/pedidoDeliveryApi'
import { derivarFluxoPagamentoEntregaDeliverySummary } from '@/src/application/mappers/DeliveryFluxoPagamentoMapper'

/** Cobrança resumida da listagem delivery (Kanban). */
export type CobrancaKanbanDeliveryResumo = {
  meioPagamentoId: string
  status: string
  momentoCobranca?: string
}

/** Entregador resumido no card delivery (summary). */
export type EntregadorKanbanDeliveryResumo = {
  id: string
  nome: string | null
  telefone: string | null
}

/**
 * Primeiro texto não vazio entre candidatos (null, undefined e string só com espaços ignorados).
 * Importante: `"" ?? resumoFiscal.status` em JS mantém ""; por isso não usamos ?? em cadeia para status.
 */
function primeiroStatusTextoNaoVazio(...candidatos: unknown[]): string | undefined {
  for (const c of candidatos) {
    if (c == null) continue
    const s = String(c).trim()
    if (s) return s
  }
  return undefined
}

/**
 * Status fiscal exibido no Kanban / DTO unificado.
 *
 * Alinhamento com o detalhe da venda (NovoPedidoModal): lá o fiscal costuma vir em `resumoFiscal.status`.
 * No GET /vendas/unificado o backend costuma expor `statusFiscal` na raiz; em alguns casos só um dos dois vem
 * preenchido (ou a raiz vem string vazia). Ordem de prioridade:
 * 1) `statusFiscal` (raiz)  2) `status_fiscal` (raiz)  3) `resumoFiscal.status`  4) `resumoFiscal.statusFiscal`
 *
 * Depois: trim + UPPER para bater com === 'REJEITADA' no VendasKanban e StatusFiscalBadge.
 */
function normalizarStatusFiscalUnificado(
  item: Record<string, unknown>
): VendaUnificadaDTO['statusFiscal'] {
  const rf =
    item.resumoFiscal && typeof item.resumoFiscal === 'object'
      ? (item.resumoFiscal as Record<string, unknown>)
      : null

  const raw = primeiroStatusTextoNaoVazio(
    item.statusFiscal,
    item.status_fiscal,
    rf?.status,
    rf?.statusFiscal
  )
  if (!raw) return null
  return raw.toUpperCase() as VendaUnificadaDTO['statusFiscal']
}

/** Evita Boolean("false") === true se a API enviar string */
function parseSolicitarEmissaoFiscal(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') {
    const t = raw.trim().toLowerCase()
    if (t === 'true' || t === '1') return true
    if (t === 'false' || t === '0' || t === '') return false
  }
  return Boolean(raw)
}

/** Etapa logística no GET unificado (nomes variam conforme backend). */
function extrairStatusEtapaOperacional(item: Record<string, unknown>): string | null {
  const keys = [
    'statusDelivery',
    'status_delivery',
    'statusEtapaOperacional',
    'status_etapa_operacional',
    'etapaOperacional',
    'etapa_operacional',
    'statusOperacional',
    'status_operacional',
  ] as const
  for (const k of keys) {
    const v = item[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return null
}

function resumoFiscalRecord(item: Record<string, unknown>): Record<string, unknown> | null {
  return item.resumoFiscal && typeof item.resumoFiscal === 'object'
    ? (item.resumoFiscal as Record<string, unknown>)
    : null
}

/** Última alteração na venda ou no resumo fiscal (listagem unificada). */
function extrairDataUltimaModificacao(item: Record<string, unknown>): string | null {
  const keys = [
    'dataUltimaModificacao',
    'DataUltimaModificacao',
    'data_ultima_modificacao',
  ] as const
  for (const k of keys) {
    const v = item[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }

  const rf = resumoFiscalRecord(item)
  if (rf) {
    for (const k of ['dataUltimaModificacao', 'data_ultima_modificacao'] as const) {
      const v = rf[k]
      if (v != null && String(v).trim() !== '') return String(v).trim()
    }
  }

  return null
}

function extrairRetornoSefaz(item: Record<string, unknown>): string | null {
  const keys = ['retornoSefaz', 'RetornoSefaz', 'retorno_sefaz'] as const
  for (const k of keys) {
    const v = item[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }

  const rf = resumoFiscalRecord(item)
  if (rf) {
    for (const k of ['retornoSefaz', 'retorno_sefaz'] as const) {
      const v = rf[k]
      if (v != null && String(v).trim() !== '') return String(v).trim()
    }
  }

  return null
}

/** Número da mesa (vendas PDV tipo mesa) — GET /vendas/unificado. */
function extrairNumeroMesa(item: Record<string, unknown>): string | number | null {
  const raw = item.numeroMesa ?? item.numero_mesa
  if (raw == null) return null
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const s = String(raw).trim()
  return s || null
}

/** Observações do pedido — GET /vendas/unificado (array de strings). */
function extrairObservacoesArray(item: Record<string, unknown>): string[] | undefined {
  const raw = item.observacoes ?? item.observacao
  if (raw == null) return undefined

  if (Array.isArray(raw)) {
    const textos = raw
      .map(entry => {
        if (typeof entry === 'string') return entry.trim()
        if (entry && typeof entry === 'object' && 'observacao' in entry) {
          return String((entry as { observacao?: string }).observacao ?? '').trim()
        }
        return ''
      })
      .filter(Boolean)
    return textos.length > 0 ? textos : undefined
  }

  if (typeof raw === 'string') {
    const t = raw.trim()
    return t ? [t] : undefined
  }

  return undefined
}

function extrairPrevisaoEntregaEm(item: Record<string, unknown>): string | null {
  const raw = item.previsaoEntregaEm ?? item.previsaoEntrega ?? item.previsao_entrega_em
  if (raw == null || String(raw).trim() === '') return null
  return String(raw).trim()
}

function extrairTempoTotalEstimadoSegundos(item: Record<string, unknown>): number | null {
  const raw = item.tempoTotalEstimadoSegundos ?? item.tempo_total_estimado_segundos
  if (raw == null) return null
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : null
}

function extrairPedidoAgendado(item: Record<string, unknown>): boolean {
  return item.pedidoAgendado === true || item.pedido_agendado === true
}

function extrairSlotIso(
  item: Record<string, unknown>,
  camel: string,
  snake: string
): string | null {
  const raw = item[camel] ?? item[snake]
  if (raw == null || String(raw).trim() === '') return null
  return String(raw).trim()
}

function extrairFluxoPagamentoEntrega(item: Record<string, unknown>): FluxoPagamentoEntrega | null {
  const direct = item.fluxoPagamentoEntrega ?? item.fluxo_pagamento_entrega
  if (direct === 'cobrar_entregador' || direct === 'ja_pago') return direct
  if (Array.isArray(item.cobrancas)) {
    const totalFaltaPagar = Number(item.totalFaltaPagar ?? item.total_falta_pagar ?? 0)
    return derivarFluxoPagamentoEntregaDeliverySummary(
      totalFaltaPagar,
      item.cobrancas as Parameters<typeof derivarFluxoPagamentoEntregaDeliverySummary>[1]
    )
  }
  return null
}

function extrairCobrancasDelivery(item: Record<string, unknown>): CobrancaKanbanDeliveryResumo[] | undefined {
  const raw = item.cobrancas
  if (!Array.isArray(raw) || raw.length === 0) return undefined

  const lista: CobrancaKanbanDeliveryResumo[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const o = entry as Record<string, unknown>
    const meioPagamentoId = String(o.meioPagamentoId ?? o.meio_pagamento_id ?? '').trim()
    if (!meioPagamentoId) continue
    const status = String(o.status ?? '').trim().toLowerCase()
    const momentoCobranca = String(o.momentoCobranca ?? o.momento_cobranca ?? '').trim()
    lista.push({
      meioPagamentoId,
      status,
      ...(momentoCobranca ? { momentoCobranca } : {}),
    })
  }

  return lista.length > 0 ? lista : undefined
}

function extrairEntregadorDelivery(
  item: Record<string, unknown>
): EntregadorKanbanDeliveryResumo | null {
  const raw = item.entregador
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? '').trim()
  if (!id) return null
  return {
    id,
    nome: o.nome != null ? String(o.nome) : null,
    telefone: o.telefone != null ? String(o.telefone) : null,
  }
}

function extrairContextoEntregaDelivery(
  item: Record<string, unknown>
): ContextoEntregaDeliveryApi | null {
  const raw = item.contextoEntrega
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as ContextoEntregaDeliveryApi
}

function extrairStatusFinanceiro(item: Record<string, unknown>): string | null {
  const direct = item.statusFinanceiro ?? item.status_financeiro
  if (direct != null && String(direct).trim() !== '') {
    return String(direct).trim().toLowerCase()
  }

  const totalFaltaPagar = Number(item.totalFaltaPagar ?? item.total_falta_pagar)
  if (Number.isFinite(totalFaltaPagar)) {
    return totalFaltaPagar <= 0 ? 'pago' : 'pendente'
  }

  const pagamento =
    item.pagamento && typeof item.pagamento === 'object'
      ? (item.pagamento as Record<string, unknown>)
      : null
  const statusPagamento = String(pagamento?.status ?? '').trim().toLowerCase()
  if (statusPagamento) return statusPagamento

  return null
}

/** Coluna do Kanban balcão resolvida no backend (`GET /vendas/unificado`). */
export type EtapaKanbanBalcao =
  | 'FINALIZADAS'
  | 'PENDENTE_EMISSAO'
  | 'COM_FISCAL'
  | 'REJEITADAS'

function extrairEtapaKanbanBalcao(item: Record<string, unknown>): EtapaKanbanBalcao | null {
  const raw = item.etapaKanbanBalcao ?? item.etapa_kanban_balcao
  if (raw == null || String(raw).trim() === '') return null
  const s = String(raw).trim().toUpperCase()
  if (
    s === 'FINALIZADAS' ||
    s === 'PENDENTE_EMISSAO' ||
    s === 'COM_FISCAL' ||
    s === 'REJEITADAS'
  ) {
    return s
  }
  return null
}

function normalizarOrigemUnificado(raw: unknown): VendaUnificadaDTO['origem'] {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
  if (s === 'PDV') return 'PDV'
  if (s === 'GESTOR') return 'GESTOR'
  if (s === 'DELIVERY' || s === 'DELIVERY_IFOOD') return 'DELIVERY_IFOOD'
  if (s === 'DELIVERY_UBER') return 'DELIVERY_UBER'
  return 'GESTOR'
}

/** Resolve tabelaOrigem do unificado; se ausente/ambíguo, deriva da origem. */
function normalizarTabelaOrigemUnificado(
  item: Record<string, unknown>
): VendaUnificadaDTO['tabelaOrigem'] {
  const raw = String(item.tabelaOrigem ?? item.tabela_origem ?? '')
    .trim()
    .toLowerCase()
  if (raw === 'venda' || raw === 'pdv' || raw === 'operacao_pdv' || raw === 'operacao-pdv') {
    return 'venda'
  }
  if (raw === 'venda_gestor' || raw === 'gestor' || raw === 'venda-gestor') {
    return 'venda_gestor'
  }

  const origem = normalizarOrigemUnificado(item.origem)
  return origem === 'PDV' ? 'venda' : 'venda_gestor'
}

function extrairAbertoPor(item: Record<string, unknown>): VendaUnificadaDTO['abertoPor'] {
  const abertoPor = item.abertoPor as VendaUnificadaDTO['abertoPor'] | null | undefined
  if (abertoPor?.id) {
    return {
      id: String(abertoPor.id),
      nome: String(abertoPor.nome ?? '—'),
    }
  }
  const id = String(item.abertoPorId ?? '').trim()
  return {
    id: id || '—',
    nome: String(item.abertoPorNome ?? '—'),
  }
}

/**
 * DTO unificado para vendas do PDV e do Gestor (TypeScript)
 * Deve corresponder à classe VendaUnificadaDTO do backend
 */
export class VendaUnificadaDTO {
  constructor(
    public readonly id: string,
    public readonly numeroVenda: number,
    public readonly codigoVenda: string,
    public readonly tipoVenda: string | null,
    public readonly origem: 'PDV' | 'GESTOR' | 'DELIVERY_IFOOD' | 'DELIVERY_UBER',
    public readonly tabelaOrigem: 'venda' | 'venda_gestor',
    public readonly valorFinal: number,
    public readonly totalDesconto: number,
    public readonly totalAcrescimo: number,
    public readonly dataCriacao: string,
    public readonly dataFinalizacao: string | null,
    public readonly dataCancelamento: string | null,
    public readonly cliente: {
      id: string
      nome: string
      cpfCnpj?: string
    } | null,
    public readonly solicitarEmissaoFiscal: boolean,
    public readonly statusFiscal:
      | 'PENDENTE'
      | 'PENDENTE_EMISSAO'
      | 'EMITINDO'
      | 'PENDENTE_AUTORIZACAO'
      | 'CONTINGENCIA'
      | 'EMITIDA'
      | 'REJEITADA'
      | 'DENEGADA'
      | 'CANCELADA'
      | 'INUTILIZADA'
      | 'UNKNOWN'
      | null,
    public readonly documentoFiscalId: string | null,
    public readonly abertoPor: {
      id: string
      nome: string
    },
    /** PDV mesa: número exibido no ícone do card (GET unificado). */
    public readonly numeroMesa?: string | number | null,
    public readonly numeroFiscal?: number | null,
    public readonly serieFiscal?: string | null,
    public readonly dataEmissaoFiscal?: string | null,
    public readonly tipoDocFiscal?: 'NFE' | 'NFCE' | null,
    /** Modelo SEFAZ (55 NF-e, 65 NFC-e) quando a API envia explícito */
    public readonly modelo?: 55 | 65 | null,
    public readonly retornoSefaz?: string | null,
    /** Etapa da logística (entrega Gestor); opcional até o backend expor no unificado. */
    public readonly statusEtapaOperacional?: string | null,
    /** Última modificação na venda (útil para “quando entrou na etapa” quando a API atualiza ao transicionar). */
    public readonly dataUltimaModificacao?: string | null,
    /** Gestor: pendente | parcial | pago | cancelado; PDV costuma vir null. */
    public readonly statusFinanceiro?: string | null,
    /** Observações do pedido (GET unificado — array de strings). */
    public readonly observacoes?: string[],
    /** Delivery Kanban: previsão de entrega/retirada (ISO). */
    public readonly previsaoEntregaEm?: string | null,
    /** Delivery Kanban: tempo estimado em segundos (fallback se sem `previsaoEntregaEm`). */
    public readonly tempoTotalEstimadoSegundos?: number | null,
    /** Delivery Kanban: antecipado vs cobrar na entrega/retirada. */
    public readonly fluxoPagamentoEntrega?: FluxoPagamentoEntrega | null,
    /** Delivery Kanban: cobranças da listagem (meio de pagamento por id). */
    public readonly cobrancasDelivery?: CobrancaKanbanDeliveryResumo[],
    /** Delivery Kanban: entregador vinculado (summary). */
    public readonly entregador?: EntregadorKanbanDeliveryResumo | null,
    /** Delivery Kanban: contexto de entrega com endereço (summary). */
    public readonly contextoEntrega?: ContextoEntregaDeliveryApi | null,
    /** Delivery Kanban: pedido com janela de agendamento. */
    public readonly pedidoAgendado?: boolean,
    /** Delivery Kanban: início da janela (ISO). */
    public readonly slotInicio?: string | null,
    /** Delivery Kanban: fim da janela (ISO). */
    public readonly slotFim?: string | null,
    /** Kanban balcão: coluna resolvida no backend (source of truth). */
    public readonly etapaKanbanBalcao?: EtapaKanbanBalcao | null
  ) {}

  private possuiDocumentoFiscal(): boolean {
    return !!this.documentoFiscalId || !!this.numeroFiscal
  }

  isPendenteEmissao(): boolean {
    // Vendas GESTOR: pendentes apenas quando foram marcadas para emissão (solicitarEmissaoFiscal), igual ao PDV
    // Vendas PDV: pendentes apenas se foram marcadas para emissão
    if (this.isCancelada()) return false
    if (this.statusFiscal === 'INUTILIZADA') return false

    if (this.isVendaGestor()) {
      return !!this.solicitarEmissaoFiscal && this.statusFiscal !== 'EMITIDA'
    }

    return this.solicitarEmissaoFiscal && this.statusFiscal !== 'EMITIDA'
  }

  temNFeEmitida(): boolean {
    const statusComDocumentoValido =
      this.statusFiscal === 'EMITIDA' || this.statusFiscal === 'CANCELADA'

    return statusComDocumentoValido && this.possuiDocumentoFiscal()
  }

  isVendaPdv(): boolean {
    return this.tabelaOrigem === 'venda'
  }

  isVendaGestor(): boolean {
    return this.tabelaOrigem === 'venda_gestor'
  }

  isDelivery(): boolean {
    const o = String(this.origem).toUpperCase()
    return o === 'DELIVERY' || o === 'DELIVERY_IFOOD' || o === 'DELIVERY_UBER'
  }

  /** Venda cancelada: por dataCancelamento ou por statusFiscal CANCELADA (API pode não enviar dataCancelamento) */
  isCancelada(): boolean {
    return !!this.dataCancelamento || this.statusFiscal === 'CANCELADA'
  }

  /** `tipoVenda` entrega/retirada/delivery ou etapa logística — vendas do módulo delivery no Kanban operacional. */
  isPedidoEntregaGestor(): boolean {
    if (this.isCancelada()) return false
    return isPedidoEntregaKanban(
      this.tabelaOrigem,
      this.tipoVenda,
      this.statusEtapaOperacional
    )
  }

  /** Delivery gestor ainda sem pagamento quitado (bloqueia finalizar no Kanban). */
  precisaConfirmarPagamentoParaFinalizar(): boolean {
    if (!this.isPedidoEntregaGestor()) return false
    const status = String(this.statusFinanceiro ?? '')
      .trim()
      .toLowerCase()
    return status === 'pendente' || status === 'parcial'
  }

  /**
   * Mapeia etapa operacional da API para id de coluna do Kanban.
   * `null`: etapa encerrada na logística → usa regras fiscais / Finalizadas abaixo.
   */
  private resolverEtapaKanbanOperacionalEntrega(): string | null {
    const raw = (this.statusEtapaOperacional ?? '').trim().toUpperCase()
    if (
      raw === 'ENTREGUE' ||
      raw === 'CONCLUIDO' ||
      raw === 'FINALIZADO' ||
      raw === 'FINALIZADA'
    ) {
      return null
    }

    const map: Record<string, string> = {
      NOVOS_PEDIDOS: 'NOVOS_PEDIDOS',
      NOVO: 'NOVOS_PEDIDOS',
      RECEBIDO: 'NOVOS_PEDIDOS',
      PENDENTE_TRIAGEM: 'NOVOS_PEDIDOS',
      PENDENTE: 'NOVOS_PEDIDOS',
      EM_PREPARO: 'EM_PREPARO',
      PREPARO: 'EM_PREPARO',
      COZINHA: 'EM_PREPARO',
      PRONTO_ENTREGA: 'PRONTO_ENTREGA',
      PRONTO: 'PRONTO_ENTREGA',
      EM_ROTA: 'EM_ROTA',
      ROTA: 'EM_ROTA',
    }

    if (raw && map[raw]) return map[raw]
    // Sem etapa na API: pedido recém-criado permanece em Novos Pedidos (mesmo com pagamento registrado)
    return 'NOVOS_PEDIDOS'
  }

  getEtapaKanban(): string {
    // Delivery operacional: logística tem prioridade sobre buckets fiscais do balcão.
    if (this.isPedidoEntregaGestor()) {
      const colunaOp = this.resolverEtapaKanbanOperacionalEntrega()
      if (colunaOp !== null) return colunaOp
    }

    // Source of truth do backend quando presente (inclui REJEITADAS / EMITINDO→COM_FISCAL).
    if (this.etapaKanbanBalcao) return this.etapaKanbanBalcao

    // Fallback client-side (espelha regras do backend) quando etapaKanbanBalcao é null.
    const sf = String(this.statusFiscal ?? '')
      .trim()
      .toUpperCase()

    if (sf === 'REJEITADA' || sf === 'DENEGADA') return 'REJEITADAS'

    if (sf && sf !== 'PENDENTE_EMISSAO') {
      // Qualquer statusFiscal não nulo e não rejeitado → COM_FISCAL (EMITINDO, PENDENTE, EMITIDA…).
      return 'COM_FISCAL'
    }

    if (this.isPendenteEmissao() || sf === 'PENDENTE_EMISSAO') return 'PENDENTE_EMISSAO'

    const statusOp = String(this.statusEtapaOperacional ?? '')
      .trim()
      .toUpperCase()
    if (
      statusOp === 'FINALIZADO' ||
      statusOp === 'FINALIZADA' ||
      statusOp === 'ENTREGUE' ||
      statusOp === 'CONCLUIDO'
    ) {
      return 'FINALIZADAS'
    }

    if (this.dataFinalizacao) return 'FINALIZADAS'
    return 'ABERTA'
  }
}

/** Normaliza `modelo` numérico da API para 55 | 65 | null */
function parseModeloFiscalApi(raw: unknown): 55 | 65 | null {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (n === 55 || n === 65) return n as 55 | 65
  return null
}

/**
 * Modelo para POST emitir-nota quando já houve tentativa (ex.: REJEITADA sem documentoId).
 * Prioriza `modelo` vindo da API; senão infere de `tipoDocFiscal` (NFE → 55, NFCE → 65).
 */
export function resolveModeloParaEmitirNota(v: VendaUnificadaDTO): 55 | 65 | null {
  if (v.modelo === 55 || v.modelo === 65) return v.modelo
  if (v.tipoDocFiscal === 'NFE') return 55
  if (v.tipoDocFiscal === 'NFCE') return 65
  return null
}

/**
 * Parâmetros alinhados ao contrato do backend GET /vendas/unificado:
 * - origem, periodoInicial, periodoFinal (filtro por dataCriacao)
 * - dataFinalizacaoInicio, dataFinalizacaoFim
 * - q (busca no servidor — pesquisa em todo o dataset, não só itens já carregados)
 */
export interface VendasUnificadasQueryParams {
  origem?: 'PDV' | 'GESTOR' | 'DELIVERY'
  /** Filtro operacional do modo delivery (entrega/retirada). Ignorado pelo unificado/balcão. */
  tipoEntrega?: 'entrega' | 'retirada'
  /** Kanban balcão: filtra server-side por coluna fiscal. */
  colunaKanban?: EtapaKanbanBalcao
  statusFiscal?: string
  periodoInicial?: string
  periodoFinal?: string
  dataCriacaoInicial?: string // ISO (filtro por data de criação)
  dataCriacaoFinal?: string
  dataFinalizacaoInicio?: string // ISO date string
  dataFinalizacaoFim?: string // ISO date string
  terminalId?: string
  q?: string // termo de busca
}

/** Resposta do backend: PaginationResult<VendaUnificadaDTO> */
export interface VendasUnificadasResponse {
  count: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
  items: VendaUnificadaDTO[]
}

/** Tamanho de cada página no Kanban (Pedidos de Clientes). */
export const VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE = 50

export interface VendasUnificadasInfiniteOptions {
  /** Polling leve enquanto o Kanban está aberto (ex.: 60_000). */
  refetchIntervalMs?: number | false
  refetchOnWindowFocus?: boolean
  enabled?: boolean
}

/** @deprecated Use VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE */
export const VENDAS_UNIFICADAS_PAGE_SIZE = VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE

/** Converte um item bruto da API em DTO (reutilizado em cada página). */
export function mapItemJsonParaVendaUnificadaDTO(v: Record<string, unknown>): VendaUnificadaDTO {
  return new VendaUnificadaDTO(
    String(v.id ?? ''),
    (v.numeroVenda as number) ?? 0,
    String(v.codigoVenda ?? ''),
    (v.tipoVenda as string | null) ?? null,
    normalizarOrigemUnificado(v.origem),
    normalizarTabelaOrigemUnificado(v),
    (v.valorFinal as number) ?? 0,
    (v.totalDesconto as number) ?? 0,
    (v.totalAcrescimo as number) ?? 0,
    String(v.dataCriacao ?? ''),
    (v.dataFinalizacao ?? null) as string | null,
    (v.dataCancelamento ?? null) as string | null,
    (v.cliente as VendaUnificadaDTO['cliente']) ?? null,
    parseSolicitarEmissaoFiscal(v.solicitarEmissaoFiscal),
    normalizarStatusFiscalUnificado(v),
    (v.documentoFiscalId ?? null) as string | null,
    extrairAbertoPor(v),
    extrairNumeroMesa(v),
    v.numeroFiscal as number | null | undefined,
    v.serieFiscal as string | null | undefined,
    v.dataEmissaoFiscal as string | null | undefined,
    v.tipoDocFiscal as VendaUnificadaDTO['tipoDocFiscal'],
    parseModeloFiscalApi(v.modelo),
    extrairRetornoSefaz(v),
    extrairStatusEtapaOperacional(v),
    extrairDataUltimaModificacao(v),
    extrairStatusFinanceiro(v),
    extrairObservacoesArray(v),
    extrairPrevisaoEntregaEm(v),
    extrairTempoTotalEstimadoSegundos(v),
    extrairFluxoPagamentoEntrega(v),
    extrairCobrancasDelivery(v),
    extrairEntregadorDelivery(v),
    extrairContextoEntregaDelivery(v),
    extrairPedidoAgendado(v),
    extrairSlotIso(v, 'slotInicio', 'slot_inicio'),
    extrairSlotIso(v, 'slotFim', 'slot_fim'),
    extrairEtapaKanbanBalcao(v)
  )
}

/**
 * Converte linha do GET /operacao-pdv/vendas (summary PDV) para o DTO do Kanban fiscal.
 * Campos fiscais extras (resumoFiscal, solicitarEmissaoFiscal) são preservados quando a API envia.
 */
export function mapVendaPdvJsonParaVendaUnificadaDTO(v: Record<string, unknown>): VendaUnificadaDTO {
  const clienteId = v.clienteId as string | null | undefined
  const clienteObj = v.cliente as VendaUnificadaDTO['cliente'] | null | undefined
  const abertoPorObj = v.abertoPor as VendaUnificadaDTO['abertoPor'] | null | undefined
  const abertoPorId = String(v.abertoPorId ?? abertoPorObj?.id ?? '')

  const unified: Record<string, unknown> = {
    ...v,
    origem: 'PDV',
    tabelaOrigem: 'venda',
    totalDesconto: (v.totalDesconto ?? 0) as number,
    totalAcrescimo: (v.totalAcrescimo ?? 0) as number,
    dataCriacao: v.dataCriacao as string,
    dataFinalizacao: (v.dataFinalizacao ?? null) as string | null,
    dataCancelamento: (v.dataCancelamento ?? null) as string | null,
    cliente:
      clienteObj ??
      (clienteId
        ? {
            id: clienteId,
            nome: String(v.identificacao ?? v.clienteNome ?? 'Cliente'),
          }
        : null),
    abertoPor: abertoPorObj ?? { id: abertoPorId, nome: String(v.abertoPorNome ?? '—') },
  }

  return mapItemJsonParaVendaUnificadaDTO(unified)
}

export function montarSearchParamsVendasUnificadas(
  params: VendasUnificadasQueryParams,
  offset: number,
  limit: number
): URLSearchParams {
  const searchParams = new URLSearchParams()
  if (params.origem) searchParams.append('origem', params.origem)
  if (params.colunaKanban) searchParams.append('colunaKanban', params.colunaKanban)
  if (params.terminalId?.trim()) searchParams.append('terminalId', params.terminalId.trim())
  if (params.statusFiscal) searchParams.append('statusFiscal', params.statusFiscal)
  const periodoInicial = params.periodoInicial ?? params.dataCriacaoInicial
  const periodoFinal = params.periodoFinal ?? params.dataCriacaoFinal
  if (periodoInicial) searchParams.append('periodoInicial', periodoInicial)
  if (periodoFinal) searchParams.append('periodoFinal', periodoFinal)
  if (params.dataFinalizacaoInicio)
    searchParams.append('dataFinalizacaoInicio', params.dataFinalizacaoInicio)
  if (params.dataFinalizacaoFim)
    searchParams.append('dataFinalizacaoFim', params.dataFinalizacaoFim)
  if (params.q?.trim()) {
    const q = params.q.trim().replace(/^#+/, '').trim()
    if (q) searchParams.append('q', q)
  }
  searchParams.append('offset', String(offset))
  searchParams.append('limit', String(limit))
  return searchParams
}

/** Uma página da API (itens já mapeados para DTO). */
export async function fetchVendasUnificadasPagina(
  params: VendasUnificadasQueryParams,
  offset: number,
  limit: number,
  token: string,
  signal?: AbortSignal
): Promise<VendasUnificadasResponse> {
  const searchParams = montarSearchParamsVendasUnificadas(params, offset, limit)

  const response = await fetchGestorApi(`/api/vendas/unificado?${searchParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    signal,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage =
      errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
    throw new Error(errorMessage)
  }

  const data = await response.json()
  const pagina =
    data?.data && typeof data.data === 'object' && !Array.isArray(data.data)
      ? (data.data as Record<string, unknown>)
      : (data as Record<string, unknown>)

  const rawItems = (pagina.items || []) as Record<string, unknown>[]
  const items = rawItems.map(mapItemJsonParaVendaUnificadaDTO)

  return {
    items,
    count: typeof pagina.count === 'number' ? pagina.count : items.length,
    page: (pagina.page as number) ?? 1,
    limit: (pagina.limit as number) ?? limit,
    totalPages: (pagina.totalPages as number) ?? 1,
    hasNext: (pagina.hasNext as boolean) ?? false,
    hasPrevious: (pagina.hasPrevious as boolean) ?? false,
  }
}

function deduplicarPaginasVendas(
  pages: VendasUnificadasResponse[]
): { items: VendaUnificadaDTO[]; totalCount: number } {
  const ids = new Set<string>()
  const items: VendaUnificadaDTO[] = []
  for (const page of pages) {
    for (const item of page.items) {
      if (!ids.has(item.id)) {
        ids.add(item.id)
        items.push(item)
      }
    }
  }
  const totalCount = Math.max(
    0,
    ...pages.map(p => (typeof p.count === 'number' ? p.count : 0)),
    items.length
  )
  return { items, totalCount }
}

export function getNextOffsetVendasUnificadas(
  lastPage: VendasUnificadasResponse,
  allPages: VendasUnificadasResponse[]
): number | undefined {
  const { items: carregadosItens } = deduplicarPaginasVendas(allPages)
  const carregados = carregadosItens.length
  const total = typeof lastPage.count === 'number' ? lastPage.count : 0

  if (total > 0 && carregados >= total) return undefined

  if (lastPage.items.length === 0) return undefined

  const idsAnteriores = new Set<string>()
  for (let i = 0; i < allPages.length - 1; i++) {
    for (const item of allPages[i].items) idsAnteriores.add(item.id)
  }
  const novosNaUltima =
    lastPage.items.length > 0
      ? lastPage.items.filter(item => !idsAnteriores.has(item.id))
      : []
  if (lastPage.items.length > 0 && novosNaUltima.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(
        '[useVendasUnificadasInfinite] Página duplicada (offset ignorado na API?). Parando paginação.'
      )
    }
    return undefined
  }

  if (!lastPage.hasNext && lastPage.items.length < VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE) {
    return undefined
  }

  return carregados
}

/**
 * Vendas unificadas com paginação infinita (Kanban).
 * Primeira página (50) exibe rápido; demais páginas via scroll na coluna.
 */
export function useVendasUnificadasInfinite(
  params: VendasUnificadasQueryParams,
  options?: VendasUnificadasInfiniteOptions
) {
  return useSecureTenantInfiniteQuery<VendasUnificadasResponse, number>(
    ['vendas-unificadas', 'infinite', params],
    ({ token }, pageParam) =>
      fetchVendasUnificadasPagina(params, pageParam, VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE, token),
    {
      placeholderData: keepPreviousData,
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => getNextOffsetVendasUnificadas(lastPage, allPages),
      enabled: options?.enabled !== false,
      refetchOnReconnect: true,
      refetchInterval: options?.refetchIntervalMs ?? false,
      refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
      refetchIntervalInBackground: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    }
  )
}

export function vendasUnificadasInfiniteQueryKey(
  params: VendasUnificadasQueryParams,
  empresaId: string | null
) {
  return ['tenant', empresaId, 'vendas-unificadas', 'infinite', params] as const
}

/** @deprecated Preferir `useVendasUnificadasInfinite` no Kanban. */
export function useVendasUnificadas(params: VendasUnificadasQueryParams) {
  return useVendasUnificadasInfinite(params)
}

/** Achata páginas do infinite query e deduplica por id. */
export function flattenVendasUnificadasInfinite(
  data: InfiniteData<VendasUnificadasResponse> | undefined
): { items: VendaUnificadaDTO[]; totalCount: number } {
  if (!data?.pages?.length) return { items: [], totalCount: 0 }
  return deduplicarPaginasVendas(data.pages)
}
