export const MODOS_VISUALIZACAO_KANBAN = ['quadro', 'expedicao', 'lista'] as const

export type ModoVisualizacaoKanban = (typeof MODOS_VISUALIZACAO_KANBAN)[number]

export const ROTULO_MODO_VISUALIZACAO_KANBAN: Record<ModoVisualizacaoKanban, string> = {
  quadro: 'Quadro',
  expedicao: 'Expedição',
  lista: 'Lista',
}

export function isModoVisualizacaoKanban(value: unknown): value is ModoVisualizacaoKanban {
  return (
    typeof value === 'string' &&
    (MODOS_VISUALIZACAO_KANBAN as readonly string[]).includes(value)
  )
}

export function parseModoVisualizacaoKanban(value: unknown): ModoVisualizacaoKanban {
  return isModoVisualizacaoKanban(value) ? value : 'quadro'
}
