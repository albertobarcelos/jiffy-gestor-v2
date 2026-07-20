import type { ColunaKanbanId, ColunaKanbanFiltroExtra } from '../types'
import type { VendaUnificadaDTO, VendasUnificadasQueryParams } from '../hooks/useVendasUnificadas'

/** Colunas fiscais do Kanban balcão — cada uma com query paginada independente. */
export const BALCAO_KANBAN_COLUMN_IDS = [
  'FINALIZADAS',
  'PENDENTE_EMISSAO',
  'COM_FISCAL',
  'REJEITADAS',
] as const satisfies readonly ColunaKanbanId[]

/** Sempre visíveis / sempre consultadas ao abrir o quadro (esquerda → direita). */
export const BALCAO_KANBAN_COLUNAS_PADRAO = [
  'FINALIZADAS',
  'COM_FISCAL',
] as const satisfies readonly ColunaKanbanId[]

/** Filtros opcionais — só montam query quando o filtro da toolbar está ativo. */
export const BALCAO_KANBAN_COLUNAS_FILTRO = [
  'PENDENTE_EMISSAO',
  'REJEITADAS',
] as const satisfies readonly ColunaKanbanId[]

export type ColunaKanbanBalcaoApi = (typeof BALCAO_KANBAN_COLUMN_IDS)[number]

export interface VendasUnificadasKanbanColumnFilterOptions {
  /** Envia `dataFinalizacaoInicio/Fim` na API (colunas fiscais). */
  enviarFiltroFinalizacaoNaApi?: boolean
}

/**
 * Colunas ativas no quadro (esquerda → direita).
 * - Emitidas (`''`): Finalizadas → Com NF
 * - Pendentes / Rejeitadas: Finalizadas → filtro → Com NF
 * - Todas: Finalizadas → Pendentes → Com NF → Rejeitadas
 */
export function balcaoKanbanColunasAtivas(
  filtroExtra?: ColunaKanbanFiltroExtra | null
): ColunaKanbanBalcaoApi[] {
  const filtro = String(filtroExtra ?? '').trim().toUpperCase()
  if (filtro === 'TODAS') {
    return ['FINALIZADAS', 'PENDENTE_EMISSAO', 'COM_FISCAL', 'REJEITADAS']
  }
  if (filtro === 'PENDENTE_EMISSAO' || filtro === 'REJEITADAS') {
    return ['FINALIZADAS', filtro, 'COM_FISCAL']
  }
  return [...BALCAO_KANBAN_COLUNAS_PADRAO]
}

/**
 * Monta filtros da API para cada coluna do Kanban balcão (`colunaKanban` server-side).
 * Nunca combina `colunaKanban` com `statusFiscal` — o backend zera o resultado.
 */
export function buildVendasUnificadasParamsForKanbanColumn(
  columnId: ColunaKanbanBalcaoApi,
  params: VendasUnificadasQueryParams,
  options?: VendasUnificadasKanbanColumnFilterOptions
): VendasUnificadasQueryParams {
  const {
    dataCriacaoInicial: _ci,
    dataCriacaoFinal: _cf,
    periodoInicial: _pi,
    periodoFinal: _pf,
    colunaKanban: _ck,
    tipoEntrega: _te,
    statusFiscal: _sf,
    q: _q,
    ...rest
  } = params

  const temFiltroFinalizacao =
    options?.enviarFiltroFinalizacaoNaApi &&
    Boolean(params.dataFinalizacaoInicio || params.dataFinalizacaoFim)

  return {
    ...rest,
    colunaKanban: columnId,
    // Busca por número/código/cliente é filtrada no client (card: "Venda 1196 - #ULUGSBYD").
    dataFinalizacaoInicio: temFiltroFinalizacao ? params.dataFinalizacaoInicio : undefined,
    dataFinalizacaoFim: temFiltroFinalizacao ? params.dataFinalizacaoFim : undefined,
  }
}

/**
 * Filtra itens da listagem balcão para a coluna visual (etapa Kanban).
 * Prefere `etapaKanbanBalcao` do backend quando disponível via getEtapaKanban.
 */
export function vendaPertenceColunaBalcaoKanban(
  venda: VendaUnificadaDTO,
  columnId: ColunaKanbanId,
  getEtapaKanban: (v: VendaUnificadaDTO) => string
): boolean {
  const etapa = getEtapaKanban(venda)

  if (columnId === 'FINALIZADAS') {
    if (
      etapa === 'COM_FISCAL' ||
      etapa === 'PENDENTE_EMISSAO' ||
      etapa === 'REJEITADAS'
    ) {
      return false
    }
    return etapa === 'FINALIZADAS' || !isColunaKanbanBalcao(etapa as ColunaKanbanId)
  }

  return etapa === columnId
}

export function isColunaKanbanBalcao(columnId: ColunaKanbanId): columnId is ColunaKanbanBalcaoApi {
  return (BALCAO_KANBAN_COLUMN_IDS as readonly ColunaKanbanId[]).includes(columnId)
}
