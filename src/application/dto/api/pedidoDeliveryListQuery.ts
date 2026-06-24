/**
 * Montagem de query string para GET /api/v1/delivery/pedidos a partir dos filtros do Kanban.
 *
 * Mapeamento origem (toolbar Kanban ↔ API delivery):
 *
 * | OrigemFiltro (UI) | Parâmetro `origem` na API | Notas |
 * |-------------------|---------------------------|-------|
 * | '' (todas)        | omitido                   |       |
 * | GESTOR            | GESTOR                    | Pedidos criados no gestor web |
 * | DELIVERY          | JIFFY_DELIVERY            | App Jiffy Delivery |
 * | PDV               | omitido                   | Não se aplica à listagem delivery; modo Balcão usa `/vendas/unificado` |
 *
 * Datas: o Kanban hoje envia `dataFinalizacaoInicio/Fim` ao unificado; na API delivery
 * os nomes são `dataFinalizacaoInicial/Final` (mapeados em `montarPedidosDeliveryQueryParams`).
 */

import type {
  OrigemPedidoDeliveryApi,
  PedidosDeliveryQueryParams,
} from '@/src/application/dto/api/pedidoDeliveryListApi'
import type { StatusDeliveryApi } from '@/src/application/dto/api/pedidoDeliveryApi'
import { PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE } from '@/src/application/dto/api/pedidoDeliveryListApi'

/**
 * Espelho de `OrigemFiltro` (`kanban/types.ts`) — definido aqui para não acoplar
 * application → presentation.
 */
export type OrigemFiltroKanbanListagem = '' | 'PDV' | 'GESTOR' | 'DELIVERY'

/** Filtros do hook `useFiscalKanbanFilters` adaptados para a listagem delivery. */
export interface FiltrosKanbanParaPedidosDelivery {
  q?: string
  origemFiltroKanban?: OrigemFiltroKanbanListagem
  dataCriacaoInicial?: string
  dataCriacaoFinal?: string
  /** Nomes do Kanban (unificado); convertidos para `dataFinalizacaoInicial/Final`. */
  dataFinalizacaoInicio?: string
  dataFinalizacaoFim?: string
  offset?: number
  limit?: number
  /** Filtro operacional por coluna (contagem / listagem segmentada). */
  statusDelivery?: StatusDeliveryApi | StatusDeliveryApi[]
  /** Default operacional: excluir cancelados (`cancelado=false`). */
  cancelado?: boolean
  /** Filtro delta: retorna itens com `dataUltimaModificacao >= valor`. Usado no re-poll do Kanban. */
  dataUltimaModificacaoInicial?: string
}

/**
 * Converte filtro de origem da toolbar para valor da API delivery.
 * `PDV` não tem equivalente — retorna `undefined` (sem filtro de origem).
 */
export function mapOrigemFiltroKanbanParaApi(
  origem: OrigemFiltroKanbanListagem | undefined
): OrigemPedidoDeliveryApi | undefined {
  if (!origem || origem === 'PDV') return undefined
  if (origem === 'GESTOR') return 'GESTOR'
  if (origem === 'DELIVERY') return 'JIFFY_DELIVERY'
  return undefined
}

/** Inverte mapeamento para exibição/debug (API → rótulo do filtro). */
export function mapOrigemApiParaFiltroKanban(
  origem: string | null | undefined
): OrigemFiltroKanbanListagem | undefined {
  const o = String(origem ?? '').trim().toUpperCase()
  if (o === 'GESTOR') return 'GESTOR'
  if (o === 'JIFFY_DELIVERY') return 'DELIVERY'
  return undefined
}

function appendParam(
  params: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined
): void {
  if (value === undefined || value === null) return
  if (typeof value === 'string' && value.trim() === '') return
  params.set(key, String(value))
}

function appendArrayParam(
  params: URLSearchParams,
  key: string,
  value: string | string[] | undefined
): void {
  if (value == null) return
  const items = Array.isArray(value) ? value : [value]
  const filtered = items.map(v => String(v).trim()).filter(Boolean)
  if (filtered.length === 0) return
  // Usa params.append para gerar ?key=A&key=B (padrão aceito pelo backend via z.array())
  filtered.forEach(v => params.append(key, v))
}

/** Serializa `PedidosDeliveryQueryParams` para query string HTTP. */
export function serializarPedidosDeliveryQueryParams(
  query: PedidosDeliveryQueryParams
): URLSearchParams {
  const params = new URLSearchParams()

  appendParam(params, 'offset', query.offset)
  appendParam(params, 'limit', query.limit)
  appendParam(params, 'q', query.q)
  appendArrayParam(params, 'statusDelivery', query.statusDelivery)
  appendArrayParam(params, 'tipoEntrega', query.tipoEntrega)
  appendArrayParam(params, 'origem', query.origem)

  if (query.solicitarEmissaoFiscal !== undefined) {
    appendParam(params, 'solicitarEmissaoFiscal', query.solicitarEmissaoFiscal)
  }
  if (query.cancelado !== undefined) {
    appendParam(params, 'cancelado', query.cancelado)
  }

  appendParam(params, 'dataCriacaoInicial', query.dataCriacaoInicial)
  appendParam(params, 'dataCriacaoFinal', query.dataCriacaoFinal)
  appendParam(params, 'dataFinalizacaoInicial', query.dataFinalizacaoInicial)
  appendParam(params, 'dataFinalizacaoFinal', query.dataFinalizacaoFinal)
  appendParam(params, 'dataUltimaModificacaoInicial', query.dataUltimaModificacaoInicial)

  return params
}

/**
 * Monta params da API delivery a partir dos filtros compartilhados do Kanban.
 * `cancelado` default `false` — quadro operacional não lista cancelados.
 */
export function montarPedidosDeliveryQueryParams(
  filtros: FiltrosKanbanParaPedidosDelivery
): PedidosDeliveryQueryParams {
  const origemApi = mapOrigemFiltroKanbanParaApi(filtros.origemFiltroKanban)

  return {
    offset: filtros.offset ?? 0,
    limit: filtros.limit ?? PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE,
    q: filtros.q?.trim() || undefined,
    statusDelivery: filtros.statusDelivery,
    origem: origemApi,
    dataCriacaoInicial: filtros.dataCriacaoInicial,
    dataCriacaoFinal: filtros.dataCriacaoFinal,
    dataFinalizacaoInicial: filtros.dataFinalizacaoInicio,
    dataFinalizacaoFinal: filtros.dataFinalizacaoFim,
    cancelado: filtros.cancelado ?? false,
    dataUltimaModificacaoInicial: filtros.dataUltimaModificacaoInicial,
  }
}

/** Query string pronta para append na URL (ex.: `/api/delivery/pedidos?…`). */
export function montarPedidosDeliveryQueryString(
  filtros: FiltrosKanbanParaPedidosDelivery
): string {
  return serializarPedidosDeliveryQueryParams(montarPedidosDeliveryQueryParams(filtros)).toString()
}

/**
 * Params para `GET /contagem-por-status` — mesmos filtros da listagem, sem paginação nem `statusDelivery`.
 */
export function montarPedidosDeliveryContagemQueryParams(
  filtros: FiltrosKanbanParaPedidosDelivery
): Omit<PedidosDeliveryQueryParams, 'offset' | 'limit' | 'statusDelivery'> {
  const { offset: _o, limit: _l, statusDelivery: _s, ...contagem } = montarPedidosDeliveryQueryParams({
    ...filtros,
    offset: 0,
    limit: 1,
  })
  return contagem
}

/** Query string para contagem por status do Kanban delivery. */
export function montarPedidosDeliveryContagemQueryString(
  filtros: FiltrosKanbanParaPedidosDelivery
): string {
  return serializarPedidosDeliveryQueryParams(
    montarPedidosDeliveryContagemQueryParams(filtros) as PedidosDeliveryQueryParams
  ).toString()
}

function parseOptionalNumeroQuery(value: string | null): number | undefined {
  if (value == null || value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function parseBooleanQuery(value: string | null): boolean | undefined {
  if (value == null || value.trim() === '') return undefined
  const t = value.trim().toLowerCase()
  if (t === 'true' || t === '1') return true
  if (t === 'false' || t === '0') return false
  return undefined
}

function parseArrayQuery(value: string | null): string | string[] | undefined {
  if (value == null || value.trim() === '') return undefined
  const partes = value
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
  if (partes.length === 0) return undefined
  if (partes.length === 1) return partes[0]
  return partes
}

/**
 * Extrai parâmetros multi-valor enviados como params repetidos
 * (`?key=A&key=B`) ou como valor único.
 */
function parseArrayQueryAll(values: string[]): string | string[] | undefined {
  const filtered = values.map(v => v.trim()).filter(Boolean)
  if (filtered.length === 0) return undefined
  if (filtered.length === 1) return filtered[0]
  return filtered
}

/** Extrai query params Jiffy a partir da URL do BFF (`GET /api/delivery/pedidos`). */
export function extrairPedidosDeliveryQueryParamsDeSearchParams(
  searchParams: URLSearchParams
): PedidosDeliveryQueryParams {
  const params: PedidosDeliveryQueryParams = {}

  const offset = parseOptionalNumeroQuery(searchParams.get('offset'))
  const limit = parseOptionalNumeroQuery(searchParams.get('limit'))
  if (offset != null) params.offset = offset
  if (limit != null) params.limit = limit

  const q = searchParams.get('q')
  if (q?.trim()) params.q = q.trim()

  const statusDelivery = parseArrayQueryAll(searchParams.getAll('statusDelivery'))
  if (statusDelivery) params.statusDelivery = statusDelivery as PedidosDeliveryQueryParams['statusDelivery']

  const tipoEntrega = parseArrayQueryAll(searchParams.getAll('tipoEntrega'))
  if (tipoEntrega) params.tipoEntrega = tipoEntrega as PedidosDeliveryQueryParams['tipoEntrega']

  const origem = parseArrayQueryAll(searchParams.getAll('origem'))
  if (origem) params.origem = origem as PedidosDeliveryQueryParams['origem']

  const solicitarEmissaoFiscal = parseBooleanQuery(searchParams.get('solicitarEmissaoFiscal'))
  if (solicitarEmissaoFiscal !== undefined) {
    params.solicitarEmissaoFiscal = solicitarEmissaoFiscal
  }

  const cancelado = parseBooleanQuery(searchParams.get('cancelado'))
  if (cancelado !== undefined) params.cancelado = cancelado

  const dataCriacaoInicial = searchParams.get('dataCriacaoInicial')
  if (dataCriacaoInicial?.trim()) params.dataCriacaoInicial = dataCriacaoInicial.trim()

  const dataCriacaoFinal = searchParams.get('dataCriacaoFinal')
  if (dataCriacaoFinal?.trim()) params.dataCriacaoFinal = dataCriacaoFinal.trim()

  const dataFinalizacaoInicial =
    searchParams.get('dataFinalizacaoInicial') ?? searchParams.get('dataFinalizacaoInicio')
  if (dataFinalizacaoInicial?.trim()) {
    params.dataFinalizacaoInicial = dataFinalizacaoInicial.trim()
  }

  const dataFinalizacaoFinal =
    searchParams.get('dataFinalizacaoFinal') ?? searchParams.get('dataFinalizacaoFim')
  if (dataFinalizacaoFinal?.trim()) {
    params.dataFinalizacaoFinal = dataFinalizacaoFinal.trim()
  }

  const dataUltimaModificacaoInicial = searchParams.get('dataUltimaModificacaoInicial')
  if (dataUltimaModificacaoInicial?.trim()) {
    params.dataUltimaModificacaoInicial = dataUltimaModificacaoInicial.trim()
  }

  return params
}

const CHAVES_QUERY_JIFFY = [
  'offset',
  'limit',
  'q',
  'statusDelivery',
  'tipoEntrega',
  'origem',
  'solicitarEmissaoFiscal',
  'cancelado',
  'dataCriacaoInicial',
  'dataCriacaoFinal',
  'dataFinalizacaoInicial',
  'dataFinalizacaoFinal',
  'dataFinalizacaoInicio',
  'dataFinalizacaoFim',
  'dataUltimaModificacaoInicial',
] as const

/** Indica se a requisição deve usar o módulo delivery Jiffy (vs integrador legado). */
export function isRequisicaoListagemPedidosJiffy(searchParams: URLSearchParams): boolean {
  if (CHAVES_QUERY_JIFFY.some(chave => searchParams.has(chave))) return true
  return false
}

/** Integrador legado: `status`/`data_atualizacao` ou header `Bearer` customizado (não Authorization). */
export function isRequisicaoListagemPedidosIntegradorLegada(
  searchParams: URLSearchParams,
  headers: { bearerHeaderCustom?: string | null; integradorToken?: string | null }
): boolean {
  if (isRequisicaoListagemPedidosJiffy(searchParams)) return false
  if (searchParams.has('status') || searchParams.has('data_atualizacao')) return true
  if (headers.bearerHeaderCustom?.trim()) return true
  if (headers.integradorToken?.trim()) return true
  return false
}
