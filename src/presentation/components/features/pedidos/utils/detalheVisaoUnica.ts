import type { ColunaKanbanId } from '@/src/presentation/components/features/kanban/types'

const MAPA_ETAPA: Record<string, ColunaKanbanId> = {
  NOVOS_PEDIDOS: 'NOVOS_PEDIDOS',
  NOVO: 'NOVOS_PEDIDOS',
  RECEBIDO: 'NOVOS_PEDIDOS',
  PENDENTE_TRIAGEM: 'NOVOS_PEDIDOS',
  PENDENTE: 'NOVOS_PEDIDOS',
  EM_PREPARO: 'EM_PREPARO',
  PREPARO: 'EM_PREPARO',
  COZINHA: 'EM_PREPARO',
  PRONTO_ENTREGA: 'PRONTO_ENTREGA',
  PRONTO: 'PRONTO_ENTREGA',
  EM_ROTA: 'EM_ROTA',
  ROTA: 'EM_ROTA',
}

const ETAPAS_CONCLUIDAS = new Set([
  'ENTREGUE',
  'CONCLUIDO',
  'FINALIZADO',
  'FINALIZADA',
])

export function colunaKanbanDeStatusEtapa(
  statusEtapaOperacional?: string | null
): ColunaKanbanId {
  const raw = String(statusEtapaOperacional ?? '').trim().toUpperCase()
  if (ETAPAS_CONCLUIDAS.has(raw)) return 'FINALIZADAS'
  return MAPA_ETAPA[raw] ?? 'NOVOS_PEDIDOS'
}

export function rotuloEtapaDetalhePedido(
  coluna: ColunaKanbanId,
  tipoVenda?: string | null
): string {
  const retirada = String(tipoVenda ?? '').trim().toLowerCase() === 'retirada'
  if (coluna === 'NOVOS_PEDIDOS') return 'Recebido'
  if (coluna === 'EM_PREPARO') return 'Em preparo'
  if (coluna === 'PRONTO_ENTREGA') return 'Pronto'
  if (coluna === 'EM_ROTA') return retirada ? 'Aguardando retirada' : 'Despachado'
  if (coluna === 'FINALIZADAS') return 'Concluído'
  return 'Em andamento'
}

export function rotuloTipoAtendimento(tipoVenda?: string | null): string {
  const tipo = String(tipoVenda ?? '').trim().toLowerCase()
  if (tipo === 'retirada') return 'Retirada'
  if (tipo === 'entrega' || tipo === 'delivery') return 'Entrega'
  if (tipo === 'balcao' || tipo === 'mesa' || tipo === 'gestor') return 'Balcão'
  return tipo ? tipo : '—'
}
