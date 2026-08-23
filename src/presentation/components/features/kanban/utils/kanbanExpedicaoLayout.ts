import type { ColunaKanbanId, KanbanColumn } from '../types'
import type { Venda } from '../types'
import { pedidoTemPendenciaExpedicao } from './kanbanPedidoTempo'

/** Coluna principal da Expedição: a cozinha ocupa o bloco grande à esquerda. */
export const COLUNA_PRIMARIA_EXPEDICAO: ColunaKanbanId = 'EM_PREPARO'

export interface LayoutExpedicaoKanban {
  primaria: KanbanColumn | null
  secundarias: KanbanColumn[]
}

export function montarLayoutExpedicao(colunas: readonly KanbanColumn[]): LayoutExpedicaoKanban {
  if (colunas.length === 0) return { primaria: null, secundarias: [] }

  const primaria =
    colunas.find(coluna => coluna.id === COLUNA_PRIMARIA_EXPEDICAO) ?? colunas[0] ?? null
  if (!primaria) return { primaria: null, secundarias: [] }

  return {
    primaria,
    secundarias: colunas.filter(coluna => coluna.id !== primaria.id),
  }
}

export function contarPendenciasExpedicao(
  vendas: readonly Venda[],
  agoraMs: number
): number {
  return vendas.reduce(
    (total, venda) => total + (pedidoTemPendenciaExpedicao(venda, agoraMs) ? 1 : 0),
    0
  )
}
