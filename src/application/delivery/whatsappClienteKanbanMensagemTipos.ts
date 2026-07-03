export type WhatsappClienteKanbanMensagemTipo =
  | 'novo_pedido'
  | 'em_preparo'
  | 'em_rota_entrega'
  | 'retirada'
  | 'finalizada'

export const WHATSAPP_CLIENTE_KANBAN_OPCOES: ReadonlyArray<{
  tipo: WhatsappClienteKanbanMensagemTipo
  label: string
}> = [
  { tipo: 'novo_pedido', label: 'Novo Pedido' },
  { tipo: 'em_preparo', label: 'Em Preparo' },
  { tipo: 'em_rota_entrega', label: 'Em Rota (entrega)' },
  { tipo: 'retirada', label: 'Retirada' },
  { tipo: 'finalizada', label: 'Finalizada' },
]
