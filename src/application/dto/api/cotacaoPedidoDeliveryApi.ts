export type CotacaoPedidoDeliveryTipoEntrega = 'entrega' | 'retirada'

export type CotacaoPedidoDeliveryComplementoItem = {
  complementoId: string
  grupoComplementoId: string
  quantidade: number
}

export type CotacaoPedidoDeliveryProdutoItem = {
  produtoId: string
  quantidade: number
  observacoes?: string[]
  complementos?: CotacaoPedidoDeliveryComplementoItem[]
}

export type CotacaoPedidoDeliveryCliente = {
  telefone: string
  enderecoIdEntrega?: string
}

/** Body do BFF Gestor: sem slug e sem origem. O servidor injeta o slug da empresa autenticada. */
export type CotacaoPedidoDeliveryBffRequest = {
  tipoEntrega: CotacaoPedidoDeliveryTipoEntrega
  cliente: CotacaoPedidoDeliveryCliente
  produtos: CotacaoPedidoDeliveryProdutoItem[]
}

export type CotacaoPedidoDeliveryBackendRequest = CotacaoPedidoDeliveryBffRequest & {
  slug: string
}

export type ResultadoCotacaoTaxaMorada =
  | { status: 'ok'; valorTaxa: number }
  | { status: 'fora' }
  | { status: 'erro'; message: string }
