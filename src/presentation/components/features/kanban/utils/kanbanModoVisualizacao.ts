export const MODOS_VISUALIZACAO_KANBAN = ['quadro', 'expedicao', 'lista'] as const

export type ModoVisualizacaoKanban = (typeof MODOS_VISUALIZACAO_KANBAN)[number]

/** Chave `expedicao` é estável no storage; o rótulo na tela é Operação. */
export const ROTULO_MODO_VISUALIZACAO_KANBAN: Record<ModoVisualizacaoKanban, string> = {
  quadro: 'Quadro',
  expedicao: 'Operação',
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

/** Gestor web: só Quadro. Flow (kiosk): os três modos. */
export function resolverModoVisualizacaoKanban(
  kiosk: boolean,
  stored: unknown
): ModoVisualizacaoKanban {
  if (!kiosk) return 'quadro'
  return parseModoVisualizacaoKanban(stored)
}
