import type { ColunaKanbanId, KanbanColumn } from '../types'
import type { Venda } from '../types'
import { pedidoTemPendenciaExpedicao } from './kanbanPedidoTempo'

/** Produção (cozinha) ocupa o bloco grande à esquerda, como no Gestor iFood. */
export const COLUNA_PRIMARIA_EXPEDICAO: ColunaKanbanId = 'EM_PREPARO'
export const COLUNA_ARQUIVO_OPERACAO: ColunaKanbanId = 'FINALIZADAS'

export interface LayoutExpedicaoKanban {
  primaria: KanbanColumn | null
  laterais: KanbanColumn[]
  arquivo: KanbanColumn | null
}

export function montarLayoutExpedicao(colunas: readonly KanbanColumn[]): LayoutExpedicaoKanban {
  if (colunas.length === 0) return { primaria: null, laterais: [], arquivo: null }

  const arquivo = colunas.find(coluna => coluna.id === COLUNA_ARQUIVO_OPERACAO) ?? null
  const semArquivo = colunas.filter(coluna => coluna.id !== COLUNA_ARQUIVO_OPERACAO)
  const primaria =
    semArquivo.find(coluna => coluna.id === COLUNA_PRIMARIA_EXPEDICAO) ?? semArquivo[0] ?? null
  if (!primaria) return { primaria: null, laterais: [], arquivo }

  return {
    primaria,
    laterais: semArquivo.filter(coluna => coluna.id !== primaria.id),
    arquivo,
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
