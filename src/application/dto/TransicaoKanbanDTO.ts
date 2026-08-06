/** Ações operacionais do Kanban entrega (gestor legado e delivery). */
export type AcaoTransicaoKanbanEntrega =
  | 'iniciar_preparo'
  | 'marcar_pronto'
  | 'despachar'
  | 'finalizar'
  | 'cancelar'

export type KanbanEntregadorCachePatch = {
  id: string
  nome?: string | null
  telefone?: string | null
}

export type KanbanVendaCachePatch = {
  statusEtapaOperacional?: string | null
  dataUltimaModificacao?: string | null
  dataFinalizacao?: string | null
  statusFinanceiro?: string | null
  valorFinal?: number
  solicitarEmissaoFiscal?: boolean | null
  statusFiscal?: string | null
  documentoFiscalId?: string | null
  numeroFiscal?: number | null
  serieFiscal?: number | null
  dataEmissaoFiscal?: string | null
  tipoDocFiscal?: string | null
  modelo?: number | null
  retornoSefaz?: string | null
  observacoes?: string[] | null
  /** Summary do entregador no card delivery; `null` limpa o vínculo exibido. */
  entregador?: KanbanEntregadorCachePatch | null
  /** Kanban balcão: coluna resolvida no backend. */
  etapaKanbanBalcao?: 'FINALIZADAS' | 'PENDENTE_EMISSAO' | 'COM_FISCAL' | 'REJEITADAS' | null
}
