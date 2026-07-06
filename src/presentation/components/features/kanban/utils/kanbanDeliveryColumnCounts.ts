import type { PedidosDeliveryContagemPorStatusResponse } from '@/src/application/dto/api/pedidoDeliveryListApi'
import type { ColunaKanbanId } from '../types'
import type { VendaUnificadaDTO } from '../hooks/useVendasUnificadas'

const COLUNAS_OPERACIONAIS_KANBAN: ColunaKanbanId[] = [
  'NOVOS_PEDIDOS',
  'EM_PREPARO',
  'PRONTO_ENTREGA',
  'EM_ROTA',
]

export type ColumnStatesContagemFallback = Partial<
  Record<ColunaKanbanId, { totalCount?: number }>
>

/** Mapeia buckets operacionais da API para colunas do Kanban delivery. */
export function mapContagemOperacionalParaColunas(
  data: PedidosDeliveryContagemPorStatusResponse
): Partial<Record<ColunaKanbanId, number>> {
  return {
    NOVOS_PEDIDOS: data.PENDENTE ?? 0,
    EM_PREPARO: data.EM_PREPARO ?? 0,
    PRONTO_ENTREGA: data.PRONTO ?? 0,
    EM_ROTA: data.EM_ROTA ?? 0,
  }
}

/**
 * Fallback enquanto `contagem-por-status` carrega: usa `count` da listagem paginada por coluna.
 */
export function mapContagemOperacionalFromListagemColunas(
  columnStates: ColumnStatesContagemFallback
): Partial<Record<ColunaKanbanId, number>> {
  const counts: Partial<Record<ColunaKanbanId, number>> = {}
  for (const columnId of COLUNAS_OPERACIONAIS_KANBAN) {
    const total = columnStates[columnId]?.totalCount
    if (typeof total === 'number') {
      counts[columnId] = total
    }
  }
  return counts
}

/**
 * Divide o total `FINALIZADO` da API entre colunas fiscais do Kanban.
 *
 * Com paginação ativa, estima via proporção do pool já carregado (mesmos filtros da listagem).
 * Sem próxima página, usa contagem exata por etapa fiscal no pool.
 */
export function derivarContagensColunasFiscaisKanban(
  finalizadoApiCount: number,
  poolItems: VendaUnificadaDTO[],
  getEtapaKanban: (v: VendaUnificadaDTO) => string,
  hasNextPage: boolean
): { FINALIZADAS: number; COM_NFE: number } {
  let comNfeLoaded = 0
  let finalizadasLoaded = 0

  for (const venda of poolItems) {
    const etapa = getEtapaKanban(venda)
    if (etapa === 'COM_NFE') comNfeLoaded += 1
    else if (etapa === 'FINALIZADAS' || etapa === 'PENDENTE_EMISSAO') finalizadasLoaded += 1
  }

  const poolLoaded = poolItems.length

  if (!hasNextPage) {
    return { FINALIZADAS: finalizadasLoaded, COM_NFE: comNfeLoaded }
  }

  if (poolLoaded === 0 || finalizadoApiCount <= 0) {
    return { FINALIZADAS: 0, COM_NFE: 0 }
  }

  const comNfe = Math.round((finalizadoApiCount * comNfeLoaded) / poolLoaded)
  const finalizadas = Math.max(0, finalizadoApiCount - comNfe)
  return { FINALIZADAS: finalizadas, COM_NFE: comNfe }
}

export function combinarContagensColunasDeliveryKanban(
  operacional: PedidosDeliveryContagemPorStatusResponse | undefined,
  finalizadoApiCount: number,
  poolItems: VendaUnificadaDTO[],
  getEtapaKanban: (v: VendaUnificadaDTO) => string,
  hasNextPageFinalizados: boolean,
  columnStatesFallback?: ColumnStatesContagemFallback
): Record<string, number> {
  const counts: Record<string, number> = {}

  if (operacional) {
    Object.assign(counts, mapContagemOperacionalParaColunas(operacional))
  } else if (columnStatesFallback) {
    Object.assign(counts, mapContagemOperacionalFromListagemColunas(columnStatesFallback))
  }

  const fiscal = derivarContagensColunasFiscaisKanban(
    finalizadoApiCount,
    poolItems,
    getEtapaKanban,
    hasNextPageFinalizados
  )
  counts.FINALIZADAS = fiscal.FINALIZADAS
  counts.COM_NFE = fiscal.COM_NFE

  return counts
}
