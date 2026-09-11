import type { ColunaKanbanId } from '@/src/presentation/components/features/kanban/types'
import type { VendaDetalheCarregadaDTO } from '@/src/application/dto/VendaDetalheCarregadaDTO'
import type { DetalhesEntregaPedido } from '@/src/domain/types/vendaDetalhe'

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
  DESPACHADO: 'EM_ROTA',
  SAIU_PARA_ENTREGA: 'EM_ROTA',
  SAIU_ENTREGA: 'EM_ROTA',
  FINALIZADAS: 'FINALIZADAS',
}

const ETAPAS_CONCLUIDAS = new Set([
  'ENTREGUE',
  'CONCLUIDO',
  'FINALIZADO',
  'FINALIZADA',
])

const ORDEM_COLUNA_DETALHE: ColunaKanbanId[] = [
  'NOVOS_PEDIDOS',
  'EM_PREPARO',
  'PRONTO_ENTREGA',
  'EM_ROTA',
  'FINALIZADAS',
]

function indiceColunaDetalhe(coluna: ColunaKanbanId): number {
  const idx = ORDEM_COLUNA_DETALHE.indexOf(coluna)
  return idx >= 0 ? idx : 0
}

export function colunaKanbanDeStatusEtapa(
  statusEtapaOperacional?: string | null
): ColunaKanbanId {
  const raw = String(statusEtapaOperacional ?? '').trim().toUpperCase()
  if (ETAPAS_CONCLUIDAS.has(raw)) return 'FINALIZADAS'
  return MAPA_ETAPA[raw] ?? 'NOVOS_PEDIDOS'
}

export function colunaKanbanDeTimestampsEntrega(
  detalhesEntrega?: DetalhesEntregaPedido | null
): ColunaKanbanId | null {
  if (!detalhesEntrega) return null
  if (String(detalhesEntrega.dataSaidaEntrega ?? '').trim()) return 'EM_ROTA'
  if (String(detalhesEntrega.dataPronto ?? '').trim()) return 'PRONTO_ENTREGA'
  if (String(detalhesEntrega.dataInicioPreparo ?? '').trim()) return 'EM_PREPARO'
  return null
}

export function colunaKanbanMaisAvancada(
  ...colunas: Array<ColunaKanbanId | null | undefined>
): ColunaKanbanId {
  let melhor: ColunaKanbanId = 'NOVOS_PEDIDOS'
  for (const coluna of colunas) {
    if (!coluna) continue
    if (indiceColunaDetalhe(coluna) > indiceColunaDetalhe(melhor)) {
      melhor = coluna
    }
  }
  return melhor
}

/** Combina GET do pedido, hint do card Kanban e timestamps — o GET gestor pode ficar atrás após EM_ROTA. */
export function resolverColunaDetalhePedido(args: {
  statusEtapaOperacional?: string | null
  statusEtapaOperacionalHint?: string | null
  detalhesEntrega?: DetalhesEntregaPedido | null
}): ColunaKanbanId {
  return colunaKanbanMaisAvancada(
    colunaKanbanDeStatusEtapa(args.statusEtapaOperacional),
    colunaKanbanDeStatusEtapa(args.statusEtapaOperacionalHint),
    colunaKanbanDeTimestampsEntrega(args.detalhesEntrega)
  )
}

export function rotuloEtapaDetalhePedido(
  coluna: ColunaKanbanId,
  tipoVenda?: string | null
): string {
  const retirada = String(tipoVenda ?? '').trim().toLowerCase() === 'retirada'
  if (coluna === 'NOVOS_PEDIDOS') return 'Recebido'
  if (coluna === 'EM_PREPARO') return 'Em preparo'
  if (coluna === 'PRONTO_ENTREGA') return 'Pronto'
  if (coluna === 'EM_ROTA') return retirada ? 'Aguardando retirada' : 'Em rota'
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

export interface HintKanbanDetalhePedido {
  statusEtapaOperacional?: string | null
  entregador?: {
    id?: string | null
    nome?: string | null
    telefone?: string | null
  } | null
}

function mesclarEntregadorHint(
  detalhes: DetalhesEntregaPedido | null,
  entregador?: HintKanbanDetalhePedido['entregador']
): DetalhesEntregaPedido | null {
  if (!entregador) return detalhes
  const id = String(entregador.id ?? '').trim()
  const nome = String(entregador.nome ?? '').trim()
  const telefone = String(entregador.telefone ?? '').trim()
  if (!id && !nome && !telefone) return detalhes

  const base: DetalhesEntregaPedido = { ...(detalhes ?? {}) }
  if (id && !base.entregadorId) base.entregadorId = id
  if (nome && !base.entregadorNome?.trim()) base.entregadorNome = nome
  if (telefone && !base.entregadorTelefone?.trim()) base.entregadorTelefone = telefone
  return base
}

/** Completa o GET do detalhe com a etapa/entregador do card Kanban quando o backend atrasar. */
export function aplicarHintKanbanNoDtoDetalhe(
  dto: VendaDetalheCarregadaDTO,
  hint?: HintKanbanDetalhePedido | null
): VendaDetalheCarregadaDTO {
  if (!hint) return dto

  const detalhesEntregaPedido = mesclarEntregadorHint(
    dto.detalhesEntregaPedido,
    hint.entregador
  )
  const colunaGet = colunaKanbanDeStatusEtapa(dto.detalhesPedidoMeta?.statusEtapaOperacional)
  const colunaHint = hint.statusEtapaOperacional
    ? colunaKanbanDeStatusEtapa(hint.statusEtapaOperacional)
    : null
  const coluna = colunaKanbanMaisAvancada(
    colunaGet,
    colunaHint,
    colunaKanbanDeTimestampsEntrega(detalhesEntregaPedido)
  )
  const statusEtapaOperacional =
    colunaHint && coluna === colunaHint && hint.statusEtapaOperacional
      ? hint.statusEtapaOperacional
      : dto.detalhesPedidoMeta?.statusEtapaOperacional

  return {
    ...dto,
    detalhesEntregaPedido,
    detalhesPedidoMeta: dto.detalhesPedidoMeta
      ? { ...dto.detalhesPedidoMeta, statusEtapaOperacional }
      : dto.detalhesPedidoMeta,
  }
}
