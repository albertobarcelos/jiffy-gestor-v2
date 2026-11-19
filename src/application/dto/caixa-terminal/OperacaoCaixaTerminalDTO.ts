export type StatusCaixaTerminal = 'aberto' | 'fechado'

export type OperacaoCaixaTerminalDetalhadaDTO = {
  id: string
  status: StatusCaixaTerminal
  empresaId?: string
  abertoPorId?: string
  terminalId?: string
  codigoTerminal?: string
  nomeTerminal?: string
  dataAbertura: string
  fechadoPorId?: string
  nomeResponsavelFechamento?: string
  dataFechamento?: string
  nomeEmpresa?: string
  resumoFechamento?: {
    responsavelFechamento?: string
    dataFechamento?: string
    tempoOperacaoInSeconds?: number
    valorFornecido?: number
    diferencaValorFornecidoEValorCaixa?: number
  } | null
  resumoOperacao?: {
    totalProdutoBruto?: number
    totalDescontoProdutos?: number
    totalAcrescimoProdutos?: number
    totalComplementoAumenta?: number
    totalComplementoDiminui?: number
    totalLiquido?: number
  }
  resumoPagamentos?: {
    meiosPagamento?: Array<{
      nomeMeioPagamento?: string
      valorContabilizado?: number
    }>
    totalTroco?: number
    totalLiquido?: number
    totalDinheiro?: number
  }
  resumoCaixa?: {
    totalDinheiro?: number
    totalSangria?: number
    totalSuprimento?: number
    totalTroco?: number
    valorLiquidoDinheiroCaixa?: number
  }
  totalProdutosVendidos?: Array<{
    quantidade?: number
    nome?: string
    valorLiquidoFinal?: number
  }>
  totalAdicionaisVendidos?: Array<{
    quantidade?: number
    nome?: string
    valorLiquidoFinal?: number
  }>
}

export type MovimentacaoCaixaTerminalInput = {
  valor: number
  descricao: string
  realizadoPorId: string
}

export type MovimentacaoCaixaTerminalDTO = {
  id: string
  valor: number
  descricao: string | null
  operacaoCaixaId?: string
  realizadoPorId?: string
  nomeResponsavel?: string | null
  dataCriacao: string
}
