export type MesaAbertaTipoVenda = 'balcao' | 'mesa' | 'gestor'

export interface MesaAbertaSummary {
  id: string
  numeroVenda: number
  codigoVenda: string
  numeroMesa?: number
  valorFinal: number
  tipoVenda: MesaAbertaTipoVenda
  abertoPorId: string
  codigoTerminal: string
  terminalId: string
  dataCriacao: string
  dataUltimaModificacao?: string
  dataUltimoProdutoLancado?: string
  clienteId?: string | null
  clienteNome?: string | null
  identificacao?: string | null
  vendaCompartilhada?: boolean
  rodizioAberto?: boolean
  dataCancelamento?: string
  dataFinalizacao?: string
  senha?: string | null
  tipoDesconto?: string | null
  valorDesconto?: number | null
  tipoAcrescimo?: string | null
  valorAcrescimo?: number | null
  totalValorProdutosRemovidos?: number | null
}

export interface MesasAbertasMetricas {
  totalFaturado: number
  countVendasEfetivadas: number
  countVendasCanceladas: number
  countProdutosVendidos: number
}

export interface UsuarioPdvResumo {
  id: string
  nome: string
}

export interface ListarMesasAbertasApiParams {
  limit: number
  offset: number
  status: 'ABERTA'
  tipoVenda: 'mesa'
}

export interface MesasAbertasApiPage {
  items: MesaAbertaSummary[]
  metricas: MesasAbertasMetricas | null
  hasNext: boolean
  page: number
}
