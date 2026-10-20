/**
 * Overlay temporário: soma pedidos delivery no dashboard sem alterar a agregação PDV.
 * Depois o backend deve entregar essas métricas já mastigadas.
 */

export type PedidoDeliveryDashboardLike = {
  valorFinal?: number
  troco?: number
  dataFinalizacao?: string | null
  dataCancelamento?: string | null
  statusDelivery?: string
  cobrancas?: Array<{
    valor: number
    meioPagamentoId: string
    status: string
    dataCancelamento?: string | null
  }>
}

export type MetricasDeliveryDashboard = {
  totalFaturado: number
  countFinalizadas: number
  countCanceladas: number
  totalCancelado: number
}

export type BlocoMetricasDashboard = {
  totalFaturado: number
  countVendasEfetivadas: number
  countVendasCanceladas: number
  countProdutosVendidos: number
}

export type AgregadoFormaPagamentoDashboard = {
  metodo: string
  formaPagamentoFiscal: string
  valor: number
  quantidade: number
}

export function pedidoDeliveryEhCancelado(
  pedido: Pick<PedidoDeliveryDashboardLike, 'statusDelivery' | 'dataCancelamento'>
): boolean {
  if (pedido.dataCancelamento) return true
  return String(pedido.statusDelivery ?? '').toUpperCase() === 'CANCELADO'
}

export function pedidoDeliveryEhFinalizado(
  pedido: Pick<PedidoDeliveryDashboardLike, 'statusDelivery' | 'dataFinalizacao' | 'dataCancelamento'>
): boolean {
  if (pedidoDeliveryEhCancelado(pedido)) return false
  if (pedido.dataFinalizacao) return true
  return String(pedido.statusDelivery ?? '').toUpperCase() === 'FINALIZADO'
}

export function agregarMetricasDeliveryDashboard(
  pedidos: PedidoDeliveryDashboardLike[]
): MetricasDeliveryDashboard {
  let totalFaturado = 0
  let countFinalizadas = 0
  let countCanceladas = 0
  let totalCancelado = 0

  for (const pedido of pedidos) {
    const valor = Number(pedido.valorFinal)
    const valorSeguro = Number.isFinite(valor) ? valor : 0

    if (pedidoDeliveryEhCancelado(pedido)) {
      countCanceladas += 1
      totalCancelado += valorSeguro
      continue
    }

    if (pedidoDeliveryEhFinalizado(pedido)) {
      countFinalizadas += 1
      totalFaturado += valorSeguro
    }
  }

  return { totalFaturado, countFinalizadas, countCanceladas, totalCancelado }
}

export function overlayMetricasPdvComDelivery<T extends {
  total: BlocoMetricasDashboard
  finalizadas: BlocoMetricasDashboard
  canceladas: BlocoMetricasDashboard
  totalCancelado: number
}>(pdv: T, delivery: MetricasDeliveryDashboard): T {
  return {
    ...pdv,
    total: {
      ...pdv.total,
      totalFaturado: pdv.total.totalFaturado + delivery.totalFaturado,
      countVendasEfetivadas: pdv.total.countVendasEfetivadas + delivery.countFinalizadas,
      countVendasCanceladas: pdv.total.countVendasCanceladas + delivery.countCanceladas,
    },
    finalizadas: {
      ...pdv.finalizadas,
      totalFaturado: pdv.finalizadas.totalFaturado + delivery.totalFaturado,
      countVendasEfetivadas: pdv.finalizadas.countVendasEfetivadas + delivery.countFinalizadas,
    },
    canceladas: {
      ...pdv.canceladas,
      totalFaturado: pdv.canceladas.totalFaturado + delivery.totalCancelado,
      countVendasCanceladas: pdv.canceladas.countVendasCanceladas + delivery.countCanceladas,
    },
    totalCancelado: pdv.totalCancelado + delivery.totalCancelado,
  }
}

function meioEhDinheiro(meio?: { nome?: string; formaPagamentoFiscal?: string }): boolean {
  if (!meio) return false
  const nomeLower = (meio.nome || '').toLowerCase()
  const formaFiscalLower = (meio.formaPagamentoFiscal || '').toLowerCase()
  return nomeLower.includes('dinheiro') || formaFiscalLower.includes('dinheiro')
}

/** Acrescenta cobranças pagas de delivery no agregado já montado pelo PDV. */
export function acrescentarCobrancasDeliveryAoAgregado(args: {
  pedidos: PedidoDeliveryDashboardLike[]
  cacheMeios: Map<string, { nome?: string; formaPagamentoFiscal?: string }>
  agregado: Map<string, AgregadoFormaPagamentoDashboard>
}): number {
  let valorAdicionado = 0

  for (const pedido of args.pedidos) {
    if (!pedidoDeliveryEhFinalizado(pedido)) continue

    const cobrancasPagas = (pedido.cobrancas ?? []).filter(
      cobranca => String(cobranca.status).toLowerCase() === 'paga' && !cobranca.dataCancelamento
    )
    if (cobrancasPagas.length === 0) continue

    const totalPago = cobrancasPagas.reduce((soma, cobranca) => soma + (Number(cobranca.valor) || 0), 0)
    const trocoCalculado =
      pedido.valorFinal != null
        ? Math.max(0, totalPago - Number(pedido.valorFinal))
        : Math.max(0, Number(pedido.troco) || 0)

    let totalDinheiro = 0
    const linhas = cobrancasPagas.map(cobranca => {
      const meio = args.cacheMeios.get(cobranca.meioPagamentoId)
      const isDinheiro = meioEhDinheiro(meio)
      const valorOriginal = Number(cobranca.valor) || 0
      if (isDinheiro) totalDinheiro += valorOriginal
      return {
        metodo: meio?.nome || 'Desconhecido',
        isDinheiro,
        valorOriginal,
        formaPagamentoFiscal: meio?.formaPagamentoFiscal ?? '',
      }
    })

    for (const linha of linhas) {
      let valor = linha.valorOriginal
      if (linha.isDinheiro && trocoCalculado > 0 && totalDinheiro > 0) {
        valor = Math.max(0, linha.valorOriginal - trocoCalculado * (linha.valorOriginal / totalDinheiro))
      }

      valorAdicionado += valor
      const existente = args.agregado.get(linha.metodo)
      if (existente) {
        existente.valor += valor
        existente.quantidade += 1
        if (!existente.formaPagamentoFiscal && linha.formaPagamentoFiscal) {
          existente.formaPagamentoFiscal = linha.formaPagamentoFiscal
        }
      } else {
        args.agregado.set(linha.metodo, {
          metodo: linha.metodo,
          formaPagamentoFiscal: linha.formaPagamentoFiscal,
          valor,
          quantidade: 1,
        })
      }
    }
  }

  return valorAdicionado
}

export function idsMeiosCobrancasDelivery(pedidos: PedidoDeliveryDashboardLike[]): string[] {
  const ids = new Set<string>()
  for (const pedido of pedidos) {
    if (!pedidoDeliveryEhFinalizado(pedido)) continue
    for (const cobranca of pedido.cobrancas ?? []) {
      if (String(cobranca.status).toLowerCase() !== 'paga' || cobranca.dataCancelamento) continue
      if (cobranca.meioPagamentoId) ids.add(cobranca.meioPagamentoId)
    }
  }
  return [...ids]
}
