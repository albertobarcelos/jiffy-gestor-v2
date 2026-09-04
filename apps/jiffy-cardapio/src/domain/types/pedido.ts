import type { UnidadeMedidaProduto } from '@/src/shared/types/unidadeMedidaProduto'

/** Tipos mínimos de linha do pedido no Cardápio público. */

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
  produtoLancadoId?: string
  nome: string
  quantidade: number
  valorUnitario: number
  valorCatalogo?: number
  permiteAlterarPreco?: boolean
  unidadeMedida?: UnidadeMedidaProduto
  complementos: ComplementoSelecionado[]
  tipoDesconto?: 'fixo' | 'porcentagem' | null
  valorDesconto?: number | null
  tipoAcrescimo?: 'fixo' | 'porcentagem' | null
  valorAcrescimo?: number | null
  valorFinal?: number | null
  observacao?: string
}

export interface PagamentoSelecionado {
  id?: string
  meioPagamentoId: string
  valor: number
  cobrarNaEntrega?: boolean
  naoEfetivo?: boolean
  cancelado?: boolean
  dataCancelamento?: string | null
  isTefUsed?: boolean
  isTefConfirmed?: boolean
}
