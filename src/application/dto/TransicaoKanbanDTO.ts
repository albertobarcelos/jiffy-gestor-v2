/** Ações operacionais do Kanban entrega (gestor legado e delivery). */
export type AcaoTransicaoKanbanEntrega =
  | 'iniciar_preparo'
  | 'marcar_pronto'
  | 'despachar'
  | 'finalizar'
  | 'cancelar'

export type KanbanVendaCachePatch = {
  statusEtapaOperacional?: string | null
  dataUltimaModificacao?: string | null
  dataFinalizacao?: string | null
}
