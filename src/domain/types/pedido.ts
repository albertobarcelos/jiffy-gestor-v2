import type { UnidadeMedidaProduto } from '@/src/shared/types/unidadeMedidaProduto'

/** Tipos de linha do pedido (compartilhados entre domain e apresentação). */

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
  /** UN = unitário (qtd inteira); KG/LT = qtd fracionária permitida. */
  unidadeMedida?: UnidadeMedidaProduto
  complementos: ComplementoSelecionado[]
  tipoDesconto?: 'fixo' | 'porcentagem' | null
  valorDesconto?: number | null
  tipoAcrescimo?: 'fixo' | 'porcentagem' | null
  valorAcrescimo?: number | null
  valorFinal?: number | null
  lancadoPorId?: string
  removido?: boolean
  removidoPorId?: string
  dataLancamento?: string
  dataRemocao?: string
  ncm?: string
  /** Texto único na UI; enviado como `observacoes: [texto]` na API. */
  observacao?: string
}

export interface PagamentoSelecionado {
  id?: string
  meioPagamentoId: string
  valor: number
  cobrarNaEntrega?: boolean
  naoEfetivo?: boolean
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

export type StatusVenda = 'ABERTA' | 'FINALIZADA' | 'PENDENTE_EMISSAO'

export type {
  OrigemVenda,
  FluxoPagamentoEntrega,
  TipoAtendimentoDelivery,
  AbaDetalhesPedido,
  EnderecoEntregaDetalhe,
  TaxaEntregaDetalhe,
  DetalhesEntregaPedido,
  UsuarioPdvEntregadorOption,
  DetalhesPedidoMeta,
  ResumoFinanceiroDetalhes,
  ResumoFiscalVenda,
  TabelaOrigemVenda,
  CanalAberturaPedido,
  MoradaEntregaSelecionada,
} from './vendaDetalhe'
