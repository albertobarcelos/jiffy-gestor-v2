import type { ColunaKanbanId } from '@/src/presentation/components/features/kanban/types'
import type { VendaDetalheCarregadaDTO } from '@/src/application/dto/VendaDetalheCarregadaDTO'
import type { DetalhesEntregaPedido } from '@/src/domain/types/vendaDetalhe'
import { colunaKanbanDeStatusEtapa as colunaKanbanDeStatusEtapaDominio } from '@/src/domain/value-objects/EtapaOperacionalDelivery'

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
): ColunaKanbanId | null {
  return colunaKanbanDeStatusEtapaDominio(statusEtapaOperacional)
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
  tipoEntrega?: string | null
): string {
  const retirada = String(tipoEntrega ?? '').trim().toLowerCase() === 'retirada'
  if (coluna === 'NOVOS_PEDIDOS') return 'Recebido'
  if (coluna === 'EM_PREPARO') return 'Em preparo'
  if (coluna === 'PRONTO_ENTREGA') return 'Pronto'
  if (coluna === 'EM_ROTA') return retirada ? 'Aguardando retirada' : 'Em rota'
  if (coluna === 'FINALIZADAS') return 'Concluído'
  return 'Em andamento'
}

export function rotuloTipoAtendimento(tipo?: string | null): string {
  const valor = String(tipo ?? '').trim().toLowerCase()
  if (valor === 'retirada') return 'Retirada'
  if (valor === 'entrega') return 'Entrega'
  if (valor === 'delivery') return 'Delivery'
  if (valor === 'balcao' || valor === 'mesa' || valor === 'gestor') return 'Balcão'
  return valor ? valor : '—'
}

/**
 * Modalidade logística do pedido delivery (`tipoEntrega`), não o canal (`tipoVenda=delivery`).
 * Retirada não usa endereço nem entregador no resumo.
 */
export function modalidadeLogisticaDetalhePedido(
  tipoEntrega?: string | null
): 'entrega' | 'retirada' | null {
  const valor = String(tipoEntrega ?? '')
    .trim()
    .toLowerCase()
  if (valor === 'entrega' || valor === 'retirada') return valor
  return null
}

export function pedidoDetalheEhEntrega(tipoEntrega?: string | null): boolean {
  return modalidadeLogisticaDetalhePedido(tipoEntrega) === 'entrega'
}

export function pedidoDetalheEhRetirada(tipoEntrega?: string | null): boolean {
  return modalidadeLogisticaDetalhePedido(tipoEntrega) === 'retirada'
}

/** Resumo estilo delivery (trilha Preparo/Rota) só para `tipoVenda=delivery`. */
export function deveUsarVisaoUnicaDetalhePedido(params: {
  tipoInicioPedido?: 'balcao' | 'delivery' | null
  tipoVenda?: string | null
}): boolean {
  if (params.tipoInicioPedido === 'delivery') return true
  if (params.tipoInicioPedido === 'balcao') return false
  return String(params.tipoVenda ?? '').trim().toLowerCase() === 'delivery'
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
