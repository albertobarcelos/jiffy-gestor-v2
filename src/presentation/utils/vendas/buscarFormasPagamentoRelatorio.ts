import { buscarTodasVendasFiltradas } from './buscarTodasVendasFiltradas'
import {
  agregarFormasPagamentoRelatorio,
  buscarDetalhesVendasParaExport,
  enriquecerMeiosPagamentoParaExport,
} from './vendasPagamentoExport'
import { agregarMetricasVendasLista } from './vendasListQuery'
import type { MetodoPagamentoRelatorio, VendaListItem, VendasFiltrosQuerySnapshot } from './vendasListTypes'

export interface FormasPagamentoRelatorioResult {
  metodos: MetodoPagamentoRelatorio[]
  totalPagamentos: number
  totalFaturado: number
}

function vendaFaturada(venda: VendaListItem): boolean {
  return Boolean(venda.dataFinalizacao) && !venda.dataCancelamento
}

export async function buscarFormasPagamentoRelatorio(input: {
  filters: VendasFiltrosQuerySnapshot
  token: string
  timeZoneEmpresa: string
  meiosPagamentoPorId: Map<string, string>
  vendasJaCarregadas?: VendaListItem[]
  listaCompleta?: boolean
}): Promise<FormasPagamentoRelatorioResult> {
  let vendas = input.vendasJaCarregadas ?? []
  if (!input.listaCompleta) {
    const todas = await buscarTodasVendasFiltradas({
      filters: input.filters,
      token: input.token,
      timeZoneEmpresa: input.timeZoneEmpresa,
    })
    vendas = todas.vendas
  }

  const faturadas = vendas.filter(vendaFaturada)
  const { pagamentosPorVendaId } = await buscarDetalhesVendasParaExport({
    vendas: faturadas,
    token: input.token,
  })
  const meios = await enriquecerMeiosPagamentoParaExport(
    input.meiosPagamentoPorId,
    pagamentosPorVendaId,
    input.token
  )
  const metodos = agregarFormasPagamentoRelatorio(faturadas, pagamentosPorVendaId, meios)
  const totalPagamentos = metodos.reduce((soma, metodo) => soma + metodo.valor, 0)
  const totalFaturado = agregarMetricasVendasLista(faturadas).totalFaturado

  return { metodos, totalPagamentos, totalFaturado }
}
