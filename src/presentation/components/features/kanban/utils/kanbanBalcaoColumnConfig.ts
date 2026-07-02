import type { ColunaKanbanId } from '../types'
import type { VendasUnificadasQueryParams } from '../hooks/useVendasUnificadas'

/** Colunas fiscais do Kanban balcão — cada uma com query paginada independente. */
export const BALCAO_KANBAN_COLUMN_IDS = [
  'FINALIZADAS',
  'PENDENTE_EMISSAO',
  'COM_NFE',
] as const satisfies readonly ColunaKanbanId[]

export type ColunaKanbanBalcaoApi = (typeof BALCAO_KANBAN_COLUMN_IDS)[number]

export interface VendasUnificadasKanbanColumnFilterOptions {
  /** Envia `dataFinalizacaoInicio/Fim` na API (colunas fiscais). */
  enviarFiltroFinalizacaoNaApi?: boolean
}

/** Monta filtros da API para cada coluna do Kanban balcão (`colunaKanban` server-side). */
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
    ...rest
  } = params

  const temFiltroFinalizacao =
    options?.enviarFiltroFinalizacaoNaApi &&
    Boolean(params.dataFinalizacaoInicio || params.dataFinalizacaoFim)

  return {
    ...rest,
    colunaKanban: columnId,
    dataFinalizacaoInicio: temFiltroFinalizacao ? params.dataFinalizacaoInicio : undefined,
    dataFinalizacaoFim: temFiltroFinalizacao ? params.dataFinalizacaoFim : undefined,
  }
}

export function isColunaKanbanBalcao(columnId: ColunaKanbanId): columnId is ColunaKanbanBalcaoApi {
  return (BALCAO_KANBAN_COLUMN_IDS as readonly ColunaKanbanId[]).includes(columnId)
}
