import type { PedidosDeliveryContagemPorStatusResponse } from '@/src/application/dto/api/pedidoDeliveryListApi'
import type { ColunaKanbanId } from '../types'
import type { VendaUnificadaDTO } from '../hooks/useVendasUnificadas'

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
  hasNextPageFinalizados: boolean
): Record<string, number> {
  const counts: Record<string, number> = {}

  if (operacional) {
    Object.assign(counts, mapContagemOperacionalParaColunas(operacional))
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
