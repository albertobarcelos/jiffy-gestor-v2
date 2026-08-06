export interface VendaListPagamentoItem {
  meioPagamentoId: string
  meioPagamentoNome?: string
  valor: number
  cancelado?: boolean
  dataCancelamento?: string | null
  isTefUsed?: boolean
  isTefConfirmed?: boolean | null
}

export interface VendaListTaxaLancadaItem {
  nome: string
  tipo: string
  valor: number
  quantidade: number
  valorCalculado: number
  dataRemocao?: string | null
}

export interface VendaListItem {
  id: string
  numeroVenda: number
  codigoVenda: string
  numeroMesa?: number
  valorFinal: number
  tipoVenda: 'balcao' | 'mesa' | 'gestor'
  abertoPorId: string
  canceladoPorId?: string
  codigoTerminal: string
  terminalId: string
  dataCriacao: string
  dataUltimoProdutoLancado?: string
  dataUltimaMovimentacao?: string
  dataCancelamento?: string
  dataFinalizacao?: string
  metodoPagamento?: string
  pagamentos?: VendaListPagamentoItem[]
  status?: string
  totalValorProdutosRemovidos?: number
}

export interface MetricasVendas {
  totalFaturado: number
  countVendasEfetivadas: number
  countVendasCanceladas: number
  countProdutosVendidos: number
}

/** Snapshot dos filtros para montar a query da listagem (GET /api/vendas). */
export interface VendasFiltrosQuerySnapshot {
  searchQuery: string
  valorMinimo: string
  valorMaximo: string
  periodo: string
  statusFilter: string | null
  tipoVendaFilter: string | null
  meioPagamentoFilter: string
  usuarioAbertoPorFilter: string
  terminalFilter: string
  usuarioCancelouFilter: string
  periodoInicial: Date | null
  periodoFinal: Date | null
}

export interface MetodoPagamentoRelatorio {
  metodo: string
  valor: number
  quantidade: number
  percentual: number
  formaPagamentoFiscal?: string
}

export interface RelatorioVendasContextoExport {
  nomeEmpresa: string
  cnpjEmpresa: string
  usuarioGerador: string
}

export interface RelatorioVendasExportInput {
  filters: VendasFiltrosQuerySnapshot
  token: string
  timeZoneEmpresa: string
  metricas: MetricasVendas | null
  usuariosPorId: Map<string, string>
  meiosPagamentoPorId: Map<string, string>
  terminaisPorId: Map<string, string>
  contexto: RelatorioVendasContextoExport
}
