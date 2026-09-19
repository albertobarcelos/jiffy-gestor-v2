/**
 * Colunas do quadro de pedidos. A etapa operacional da API não é o id da coluna:
 * `PENDENTE` → `NOVOS_PEDIDOS`, `PRONTO` → `PRONTO_ENTREGA`.
 */
export type ColunaKanbanOperacionalId =
  | 'NOVOS_PEDIDOS'
  | 'EM_PREPARO'
  | 'PRONTO_ENTREGA'
  | 'EM_ROTA'

export type ColunaKanbanFiscalId =
  | 'FINALIZADAS'
  | 'PENDENTE_EMISSAO'
  | 'COM_FISCAL'
  | 'REJEITADAS'

export type ColunaKanbanId = ColunaKanbanOperacionalId | ColunaKanbanFiscalId

export const COLUNAS_KANBAN_OPERACIONAIS: readonly ColunaKanbanOperacionalId[] = [
  'NOVOS_PEDIDOS',
  'EM_PREPARO',
  'PRONTO_ENTREGA',
  'EM_ROTA',
]

export const COLUNAS_KANBAN_DELIVERY: readonly ColunaKanbanId[] = [
  ...COLUNAS_KANBAN_OPERACIONAIS,
  'FINALIZADAS',
]
