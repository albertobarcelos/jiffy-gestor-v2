export interface PagamentoSelecionado {
  meioPagamentoId: string
  valor: number
  realizadoPorId?: string
  cancelado?: boolean
  canceladoPorId?: string
  dataCriacao?: string
  dataCancelamento?: string
  isTefUsed?: boolean
  isTefConfirmed?: boolean
  tefIdentifier?: string
  tefAdquirente?: string
  cnpjAdquirente?: string
  codigoAutorizacao?: string
  tipoIntegracao?: string
  bandeiraCartao?: string
}

/** Trecho retornado pela API quando `incluirFiscal=true` */
export interface ResumoFiscalVenda {
  status?: string | null
  numero?: number | null
  retornoSefaz?: string | null
  serie?: string | null
  dataEmissao?: string | null
  modelo?: number | null
  chaveFiscal?: string | null
  dataCriacao?: string | null
  dataUltimaModificacao?: string | null
  /** Id do documento fiscal — mesmo usado em GET `/api/nfe/[id]` (Kanban “Ver NFCe/NFe”) */
  documentoFiscalId?: string | null
  codigoRetorno?: string | null
}

export interface ComplementoSelecionado {
  id: string
  grupoId: string
  nome: string
  valor: number
  quantidade: number
  tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'
}

export interface ProdutoSelecionado {
  produtoId: string
  nome: string
  quantidade: number
  valorUnitario: number
  complementos: ComplementoSelecionado[]
  tipoDesconto?: 'fixo' | 'porcentagem' | null
  valorDesconto?: number | null
  tipoAcrescimo?: 'fixo' | 'porcentagem' | null
  valorAcrescimo?: number | null
  valorFinal?: number | null // Valor final do produto quando carregado do backend (já calculado)
  lancadoPorId?: string
  removido?: boolean
  removidoPorId?: string
  dataLancamento?: string
  dataRemocao?: string
  ncm?: string
}

export type OrigemVenda = 'GESTOR' | 'IFOOD' | 'RAPPI' | 'OUTROS'
export type StatusVenda = 'ABERTA' | 'FINALIZADA' | 'PENDENTE_EMISSAO'

/** Abas em Detalhes do Pedido (passo 4) */
export type AbaDetalhesPedido = 'infoPedido' | 'listaProdutos' | 'pagamentos' | 'notaFiscal'

export interface DetalhesPedidoMeta {
  numeroVenda?: number | null
  codigoVenda?: string | null
  tipoVenda?: string | null
  numeroMesa?: string | number | null
  statusMesa?: string | null
  abertoPorId?: string | null
  ultimoResponsavelId?: string | null
  canceladoPorId?: string | null
  codigoTerminal?: string | null
  terminalId?: string | null
  identificacao?: string | null
  solicitarEmissaoFiscal?: boolean | null
  dataCriacao?: string | null
  dataFinalizacao?: string | null
  dataCancelamento?: string | null
  dataUltimaModificacao?: string | null
  dataUltimoProdutoLancado?: string | null
}

export interface ResumoFinanceiroDetalhes {
  totalItensLancados: number
  totalItensCancelados: number
  totalDosItens: number
  totalDescontosConta: number
  totalAcrescimosConta: number
}
