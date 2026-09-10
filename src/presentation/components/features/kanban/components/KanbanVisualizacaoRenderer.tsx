'use client'

import type { ModoVisualizacaoKanban } from '../utils/kanbanModoVisualizacao'
import { KanbanBoardRenderer, type KanbanBoardRendererProps } from './KanbanBoardRenderer'
import { KanbanExpedicaoRenderer } from './KanbanExpedicaoRenderer'
import { KanbanListaRenderer } from './KanbanListaRenderer'

export interface KanbanVisualizacaoRendererProps extends KanbanBoardRendererProps {
  modoVisualizacao: ModoVisualizacaoKanban
}

export function KanbanVisualizacaoRenderer({
  modoVisualizacao,
  ...boardProps
}: KanbanVisualizacaoRendererProps) {
  if (modoVisualizacao === 'expedicao') {
    return <KanbanExpedicaoRenderer {...boardProps} />
  }
  if (modoVisualizacao === 'lista') {
    return <KanbanListaRenderer {...boardProps} />
  }
  return <KanbanBoardRenderer {...boardProps} />
}
