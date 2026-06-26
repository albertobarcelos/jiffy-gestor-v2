import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type { VendasUnificadasQueryParams } from '../hooks/useVendasUnificadas'
import type { ColunaKanbanId, Venda } from '../types'

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
 * Filtro de datas da toolbar aplicado client-side (fallback).
 * Preferir filtros na API via `enviarFiltroCriacaoNaApi` e `dataFinalizacaoInicial/Final`.
 */
export function filtrarPedidosDeliveryKanbanPorDatasToolbar(
  vendas: Venda[],
  params: VendasUnificadasQueryParams
): Venda[] {
  return vendas.filter(venda => filtrarVendaDeliveryKanbanColunaPorDatasToolbar(venda, 'NOVOS_PEDIDOS', params))
}

/**
 * Filtro de datas da toolbar por coluna delivery.
 * - Criação: todas as colunas quando o período de criação está ativo na consulta.
 * - Finalização: apenas colunas fiscais (FINALIZADAS / COM_NFE).
 */
export function filtrarVendaDeliveryKanbanColunaPorDatasToolbar(
  venda: Venda,
  columnId: ColunaKanbanId,
  params: VendasUnificadasQueryParams
): boolean {
  const temFiltroCriacao = Boolean(params.dataCriacaoInicial || params.dataCriacaoFinal)
  const temFiltroFinalizacao = Boolean(params.dataFinalizacaoInicio || params.dataFinalizacaoFim)
  const isColunaFiscal = columnId === 'FINALIZADAS' || columnId === 'COM_NFE'

  if (!temFiltroCriacao && !temFiltroFinalizacao) return true

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

  if (temFiltroFinalizacao && isColunaFiscal) {
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
}

/** Intervalo de polling da listagem enquanto o Kanban está aberto (multi-estação). */
export const KANBAN_VENDAS_REFETCH_INTERVAL_MS = 60_000

/** Re-poll delta do Kanban delivery (só pedidos modificados). */
export const KANBAN_DELIVERY_DELTA_POLL_INTERVAL_MS = 30_000
