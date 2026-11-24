export type VendaPainelTipoVenda =
  | 'balcao'
  | 'mesa'
  | 'gestor'
  | 'delivery'
  | 'entrega'
  | 'retirada'
  | string

export interface ResumoFiscalPainelDTO {
  id: string
  chaveFiscal: string | null
  codigoRetorno: string | null
  terminalId: string | null
  dataCriacao: string | null
  dataEmissao: string | null
  dataUltimaModificacao: string | null
  documentoFiscalId: string | null
  empresaId: string | null
  modelo: number | null
  numero: string | number | null
  retornoSefaz: string | null
  serie: string | number | null
  status: string | null
  vendaId: string | null
}

export interface TaxaLancadaPainelDTO {
  id: string
  vendaId?: string
  taxaId?: string
  nome: string
  tipo: string
  valor: number
  quantidade: number
  valorCalculado: number
  lancadoAutomatico?: boolean
  lancadoPorId?: string
  removidoPorId?: string
  dataLancamento?: string
  dataRemocao?: string
}

export interface ObservacaoLancadaPainelDTO {
  id?: string
  observacao: string
}

export interface ComplementoPainelDTO {
  nomeComplemento: string
  quantidade: number
  valorUnitario: number
  tipoImpactoPreco: 'aumenta' | 'diminui' | 'nenhum'
  tipoComplemento?: string | null
}

export interface PizzaSaborPainelDTO {
  nomeSabor: string
  quantidadePartes?: number
}

export interface PizzaLancadaPainelDTO {
  nomeTamanho?: string
  nomeCategoria?: string
  totalPartes?: number
  sabores?: PizzaSaborPainelDTO[]
}

export interface ProdutoLancadoPainelDTO {
  id?: string
  nomeProduto: string
  quantidade: number
  valorUnitario: number
  incidiuTaxa?: boolean
  desconto?: string | number
  tipoDesconto?: 'porcentagem' | 'fixo'
  acrescimo?: string | number
  tipoAcrescimo?: 'porcentagem' | 'fixo'
  complementos: ComplementoPainelDTO[]
  dataLancamento: string
  lancadoPorId: string
  vendaId: string
  removido: boolean
  removidoPorId?: string
  dataRemocao?: string
  motivoRemocao?: string | null
  tipoItem?: string
  observacoes?: ObservacaoLancadaPainelDTO[]
  pizzaLancada?: PizzaLancadaPainelDTO | null
}

export interface FaixaRodizioPainelDTO {
  id?: string
  nomeFaixa: string
  quantidade: number
  valorUnitario: number
  removida?: boolean
}

export interface ItemRodadaPainelDTO {
  id?: string
  nomeItem: string
  quantidade: number
}

export interface RodadaRodizioPainelDTO {
  id?: string
  numeroRodada: number
  status?: string
  canceladaEm?: string | null
  itens?: ItemRodadaPainelDTO[]
}

export interface RodizioSessaoPainelDTO {
  nomeRodizio?: string
  status?: string
  encerradaEm?: string | null
  faixasLancadas?: FaixaRodizioPainelDTO[]
  rodadas?: RodadaRodizioPainelDTO[]
}

export interface SnapshotVendaPainelDTO {
  papel?: string
  numeroMesa?: string | null
  vendaId?: string
}

export interface MovimentacaoVendaPainelDTO {
  id?: string
  tipoMovimentacao?: string
  snapshotsVenda?: SnapshotVendaPainelDTO[]
  snapshotProduto?: { nomeProduto?: string } | null
}

export interface PagamentoPainelDTO {
  meioPagamentoId: string
  valor: number
  dataCriacao: string
  realizadoPorId: string
  canceladoPorId?: string
  cancelado: boolean
  dataCancelamento?: string
  isTefUsed?: boolean
  isTefConfirmed?: boolean
  bandeiraCartao?: string | null
  codigoAutorizacao?: string | null
}

export interface MeioPagamentoPainelDTO {
  id: string
  nome: string
  formaPagamentoFiscal?: string
}

export interface VendaPainelDetalheDTO {
  id: string
  numeroVenda: number
  codigoVenda: string
  numeroMesa?: number
  valorFinal: number
  tipoVenda: VendaPainelTipoVenda
  tipoEntrega?: 'entrega' | 'retirada' | null
  abertoPorId: string
  codigoTerminal: string
  terminalId: string
  dataCriacao: string
  dataUltimaModificacao?: string
  dataUltimoProdutoLancado?: string
  dataCancelamento?: string
  dataFinalizacao?: string
  canceladoPorId?: string
  ultimoResponsavelId?: string
  statusMesa?: string
  clienteId?: string
  identificacao?: string
  documentoCpfCnpj?: string | null
  troco?: number
  produtosLancados: ProdutoLancadoPainelDTO[]
  taxasLancadas?: TaxaLancadaPainelDTO[]
  totalDesconto?: number
  totalAcrescimo?: number
  tipoDesconto?: string | null
  valorDesconto?: number | null
  tipoAcrescimo?: string | null
  valorAcrescimo?: number | null
  pagamentos: PagamentoPainelDTO[]
  senha?: string | null
  vendaCompartilhada?: boolean
  rodizioSessao?: RodizioSessaoPainelDTO | null
  movimentacoes?: MovimentacaoVendaPainelDTO[]
  statusVenda?: string | null
  origem?: string | null
  solicitarEmissaoFiscal?: boolean | null
  statusFiscal?: string | null
  documentoFiscalId?: string | null
  retornoSefaz?: string | null
  resumoFiscal?: ResumoFiscalPainelDTO | null
}

export interface CarregarPainelDetalheVendaResultDTO {
  venda: VendaPainelDetalheDTO
  nomesUsuarios: Record<string, string>
  nomesMeiosPagamento: Record<string, MeioPagamentoPainelDTO>
  nomeCliente: string | null
  nomeTerminalResumoFiscal: string | null
  nomeEmpresaResumoFiscal: string | null
}

export interface CarregarPainelDetalheVendaParams {
  vendaId: string
  token: string
  tabelaOrigem: 'venda' | 'venda_gestor'
  tipoEntregaLista?: 'entrega' | 'retirada' | null
}
