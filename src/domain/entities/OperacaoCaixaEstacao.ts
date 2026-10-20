export type StatusOperacaoCaixaEstacao = 'aberto' | 'fechado'

export interface AtorOperacaoCaixaEstacao {
  id: string
  type: string
  sourceReference: string
  nome: string
}

export interface EstacaoOperacaoCaixaEstacao {
  id: string
  nome: string
}

export interface ResumoOperacaoCaixaEstacao {
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

export interface ResumoCaixaOperacaoEstacao {
  totalSuprimento: number
  totalSangria: number
  valorLiquidoDinheiroCaixa: number
}

export interface MeioPagamentoOperacaoCaixaEstacao {
  nomeMeioPagamento: string
  nomeFormaPagamentoFiscal?: string
  meioPagamentoId?: string
  valorContabilizado: number
}

export interface ResumoPagamentosOperacaoCaixaEstacao {
  total: number
  totalLiquido: number
  totalDinheiro: number
  totalTroco: number
  meiosPagamento: MeioPagamentoOperacaoCaixaEstacao[]
}

export interface ResumoFechamentoOperacaoCaixaEstacao {
  valorFornecido: number
  diferencaValorFornecidoEValorCaixa: number
  tempoOperacaoInSeconds: number
  dataFechamento: string
  fechadoPorAtor: AtorOperacaoCaixaEstacao
}

export interface ProdutoVendidoOperacaoCaixaEstacao {
  nome: string
  quantidade: number
  valorLiquidoFinal: number
}

export interface OperacaoCaixaEstacaoProps {
  id: string
  status: StatusOperacaoCaixaEstacao
  empresaId: string
  abertoPorAtor: AtorOperacaoCaixaEstacao
  estacao: EstacaoOperacaoCaixaEstacao
  dataAbertura: string
  dataFechamento: string | null
  fechadoPorAtor: AtorOperacaoCaixaEstacao | null
  nomeEmpresa?: string
  resumoOperacao?: ResumoOperacaoCaixaEstacao
  resumoCaixa?: ResumoCaixaOperacaoEstacao
  resumoPagamentos?: ResumoPagamentosOperacaoCaixaEstacao
  resumoFechamento?: ResumoFechamentoOperacaoCaixaEstacao | null
  totalProdutosVendidos?: ProdutoVendidoOperacaoCaixaEstacao[]
  totalAdicionaisVendidos?: ProdutoVendidoOperacaoCaixaEstacao[]
}

/**
 * Operação de caixa da estação do Gestor (delivery + balcão deste PC).
 */
export class OperacaoCaixaEstacao {
  readonly id: string
  readonly status: StatusOperacaoCaixaEstacao
  readonly empresaId: string
  readonly abertoPorAtor: AtorOperacaoCaixaEstacao
  readonly estacao: EstacaoOperacaoCaixaEstacao
  readonly dataAbertura: string
  readonly dataFechamento: string | null
  readonly fechadoPorAtor: AtorOperacaoCaixaEstacao | null
  readonly nomeEmpresa?: string
  readonly resumoOperacao?: ResumoOperacaoCaixaEstacao
  readonly resumoCaixa?: ResumoCaixaOperacaoEstacao
  readonly resumoPagamentos?: ResumoPagamentosOperacaoCaixaEstacao
  readonly resumoFechamento?: ResumoFechamentoOperacaoCaixaEstacao | null
  readonly totalProdutosVendidos?: ProdutoVendidoOperacaoCaixaEstacao[]
  readonly totalAdicionaisVendidos?: ProdutoVendidoOperacaoCaixaEstacao[]

  private constructor(props: OperacaoCaixaEstacaoProps) {
    if (!props.id?.trim()) {
      throw new Error('Operação de caixa inválida: id ausente.')
    }
    this.id = props.id.trim()
    this.status = props.status
    this.empresaId = props.empresaId
    this.abertoPorAtor = props.abertoPorAtor
    this.estacao = props.estacao
    this.dataAbertura = props.dataAbertura
    this.dataFechamento = props.dataFechamento
    this.fechadoPorAtor = props.fechadoPorAtor
    this.nomeEmpresa = props.nomeEmpresa
    this.resumoOperacao = props.resumoOperacao
    this.resumoCaixa = props.resumoCaixa
    this.resumoPagamentos = props.resumoPagamentos
    this.resumoFechamento = props.resumoFechamento
    this.totalProdutosVendidos = props.totalProdutosVendidos
    this.totalAdicionaisVendidos = props.totalAdicionaisVendidos
  }

  static create(props: OperacaoCaixaEstacaoProps): OperacaoCaixaEstacao {
    return new OperacaoCaixaEstacao(props)
  }

  isAberta(): boolean {
    return this.status === 'aberto'
  }

  getValorLiquidoDinheiroCaixa(): number {
    return this.resumoCaixa?.valorLiquidoDinheiroCaixa ?? 0
  }
}
