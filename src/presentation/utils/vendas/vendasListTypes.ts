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

export type VendaListTipoVenda =
  | 'balcao'
  | 'mesa'
  | 'gestor'
  | 'delivery'
  | 'entrega'
  | 'retirada'
  | string

export interface VendaListItem {
  id: string
  numeroVenda: number
  codigoVenda: string
  numeroMesa?: number
  valorFinal: number
  tipoVenda: VendaListTipoVenda
  /** Logística do delivery. Não substitui `tipoVenda`. */
  tipoEntrega?: 'entrega' | 'retirada' | null
  origem?: string | null
  tabelaOrigem?: 'venda' | 'venda_gestor'
  abertoPorId: string
  abertoPorNome?: string
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
  documentoFiscalId?: string | null
}

export interface MetricasVendas {
  totalFaturado: number
  countVendasEfetivadas: number
  countVendasCanceladas: number
  /** Ausente na listagem unificada (sem itens da venda). */
  countProdutosVendidos: number | null
  /** Soma de `valorFinal` das vendas canceladas do conjunto completo. */
  totalCancelado: number
}

/** Snapshot dos filtros para montar a query da listagem (GET /api/vendas/unificado). */
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
