export type StatusCaixaEstacao = 'aberto' | 'fechado'

export interface AtorCaixaEstacaoDTO {
  id: string
  type: string
  sourceReference: string
  nome: string
}

export interface EstacaoCaixaDTO {
  id: string
  nome: string
}

export interface ResumoOperacaoCaixaEstacaoDTO {
  totalProdutoBruto: number
  totalLiquido: number
  totalDescontoProdutos: number
  totalAcrescimoProdutos: number
  totalAcrescimoVenda: number
  totalDescontoVenda: number
  totalTaxas: number
  totalComplementoAumenta: number
  totalComplementoDiminui: number
  countVendasEfetivadas: number
  countVendasCanceladas: number
  countProdutosVendidos: number
}

export interface ResumoCaixaEstacaoDTO {
  totalSuprimento: number
  totalSangria: number
  valorLiquidoDinheiroCaixa: number
}

export interface MeioPagamentoCaixaEstacaoDTO {
  nomeMeioPagamento: string
  nomeFormaPagamentoFiscal?: string
  meioPagamentoId?: string
  valorContabilizado: number
}

export interface ResumoPagamentosCaixaEstacaoDTO {
  total: number
  totalLiquido: number
  totalDinheiro: number
  totalTroco: number
  meiosPagamento: MeioPagamentoCaixaEstacaoDTO[]
}

export interface ResumoFechamentoCaixaEstacaoDTO {
  valorFornecido: number
  diferencaValorFornecidoEValorCaixa: number
  tempoOperacaoInSeconds: number
  dataFechamento: string
  fechadoPorAtor: AtorCaixaEstacaoDTO
}

export interface ProdutoVendidoCaixaEstacaoDTO {
  nome: string
  quantidade: number
  valorLiquidoFinal: number
}

export interface OperacaoCaixaEstacaoListaItemDTO {
  id: string
  status: StatusCaixaEstacao
  empresaId: string
  abertoPorAtor: AtorCaixaEstacaoDTO
  estacao: EstacaoCaixaDTO
  dataAbertura: string
  dataFechamento: string | null
  fechadoPorAtor: AtorCaixaEstacaoDTO | null
}

export interface OperacaoCaixaEstacaoDTO extends OperacaoCaixaEstacaoListaItemDTO {
  nomeEmpresa?: string
  resumoOperacao?: ResumoOperacaoCaixaEstacaoDTO
  resumoCaixa?: ResumoCaixaEstacaoDTO
  resumoPagamentos?: ResumoPagamentosCaixaEstacaoDTO
  resumoFechamento?: ResumoFechamentoCaixaEstacaoDTO | null
  totalProdutosVendidos?: ProdutoVendidoCaixaEstacaoDTO[]
  totalAdicionaisVendidos?: ProdutoVendidoCaixaEstacaoDTO[]
}

export interface PaginationOperacaoCaixaEstacaoDTO {
  count: number
  limit: number
  offset: number
  page: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
  items: OperacaoCaixaEstacaoListaItemDTO[]
}

export interface MovimentacaoCaixaEstacaoDTO {
  id: string
  valor: number
  descricao: string | null
  operacaoCaixaId: string
  realizadoPorAtor: AtorCaixaEstacaoDTO
  dataCriacao: string
}

export interface CaixaEstacaoAtualDTO {
  aberta: boolean
  operacao: OperacaoCaixaEstacaoDTO | null
}

export interface ListarOperacoesCaixaEstacaoInput {
  limit?: number
  offset?: number
  q?: string
  dataAberturaInicio?: string
  dataAberturaFim?: string
  estacaoGestorId?: string
  status?: StatusCaixaEstacao
}

export interface MovimentacaoCaixaEstacaoInput {
  valor: number
  descricao: string
}

export interface FecharCaixaEstacaoInput {
  valorFornecido: number
}
