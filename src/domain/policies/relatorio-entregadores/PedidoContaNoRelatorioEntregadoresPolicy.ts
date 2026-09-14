import type {
  PedidoRelatorioEntregadores,
  PeriodoFinalizacaoRelatorio,
} from '@/src/domain/relatorio-entregadores/tipos'

const STATUS_FORA = new Set(['CANCELADO', 'EM_ROTA'])

function noPeriodo(data: Date, periodo: PeriodoFinalizacaoRelatorio): boolean {
  const t = data.getTime()
  return t >= periodo.inicio.getTime() && t <= periodo.fim.getTime()
}

/**
 * Entra no acerto: entrega, com entregador, fora de rota/cancelado.
 * Finalizado usa a data de finalização (fallback: criação). Demais usam a criação.
 */
export class PedidoContaNoRelatorioEntregadoresPolicy {
  static check(
    pedido: PedidoRelatorioEntregadores,
    periodo: PeriodoFinalizacaoRelatorio
  ): boolean {
    if (pedido.tipoEntrega !== 'entrega') return false
    if (!pedido.entregadorId?.trim()) return false
    if (STATUS_FORA.has(pedido.statusDelivery)) return false

    const dataRef =
      pedido.statusDelivery === 'FINALIZADO'
        ? pedido.dataFinalizacao ?? pedido.dataCriacao
        : pedido.dataCriacao

    if (!dataRef) return false
    return noPeriodo(dataRef, periodo)
  }
}
