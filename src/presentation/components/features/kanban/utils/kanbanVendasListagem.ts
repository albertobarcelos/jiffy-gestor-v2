import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type { VendasUnificadasQueryParams } from '../hooks/useVendasUnificadas'
import type { Venda } from '../types'

/** Separa vendas unificadas pelo modo ativo do quadro (delivery vs balcão). */
export function filtrarVendasKanbanPorModo(vendas: Venda[], modo: ModoKanbanVendas): Venda[] {
  if (modo === 'delivery') {
    return vendas.filter(venda => venda.isPedidoEntregaGestor())
  }
  return vendas.filter(venda => !venda.isPedidoEntregaGestor())
}

function dentroDoIntervaloIso(
  valorIso: string | null | undefined,
  inicioIso?: string,
  fimIso?: string
): boolean {
  if (!valorIso?.trim()) return false
  const t = new Date(valorIso).getTime()
  if (!Number.isFinite(t)) return false
  if (inicioIso) {
    const inicio = new Date(inicioIso).getTime()
    if (Number.isFinite(inicio) && t < inicio) return false
  }
  if (fimIso) {
    const fim = new Date(fimIso).getTime()
    if (Number.isFinite(fim) && t > fim) return false
  }
  return true
}

/**
 * Filtro de datas da toolbar aplicado client-side no modo delivery.
 * A API operacional (carga + delta) não envia datas — evita 500 e garante
 * que pedidos novos apareçam via re-poll.
 */
export function filtrarPedidosDeliveryKanbanPorDatasToolbar(
  vendas: Venda[],
  params: VendasUnificadasQueryParams
): Venda[] {
  const temFiltroCriacao = Boolean(params.dataCriacaoInicial || params.dataCriacaoFinal)
  const temFiltroFinalizacao = Boolean(params.dataFinalizacaoInicio || params.dataFinalizacaoFim)
  if (!temFiltroCriacao && !temFiltroFinalizacao) return vendas

  return vendas.filter(venda => {
    if (temFiltroCriacao) {
      if (
        !dentroDoIntervaloIso(
          venda.dataCriacao,
          params.dataCriacaoInicial,
          params.dataCriacaoFinal
        )
      ) {
        return false
      }
    }
    if (temFiltroFinalizacao) {
      if (
        !dentroDoIntervaloIso(
          venda.dataFinalizacao,
          params.dataFinalizacaoInicio,
          params.dataFinalizacaoFim
        )
      ) {
        return false
      }
    }
    return true
  })
}

/** Intervalo de polling da listagem enquanto o Kanban está aberto (multi-estação). */
export const KANBAN_VENDAS_REFETCH_INTERVAL_MS = 60_000

/** Re-poll delta do Kanban delivery (só pedidos modificados). */
export const KANBAN_DELIVERY_DELTA_POLL_INTERVAL_MS = 30_000
