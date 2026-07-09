export type DeliveryPublicoProdutoViewModel = {
  id: string
  nome: string
  descricao: string | null
  preco: number
  imagemUrl: string | null
  grupoId: string
}

export type DeliveryPublicoGrupoViewModel = {
  id: string
  nome: string
  /** Ícone padrão do grupo no ERP (fallback quando não há override no design). */
  iconName?: string | null
  imagemUrl?: string | null
  produtos: DeliveryPublicoProdutoViewModel[]
}

export type DeliveryPublicoCarrinhoViewModel = {
  total: number
  quantidadeItens: number
}

export type DeliveryPublicoViewModel = {
  grupos: DeliveryPublicoGrupoViewModel[]
  disponivel: boolean
  horarioTexto: string
  tipoEntrega: 'entrega' | 'retirada'
  termoBusca: string
  carrinho: DeliveryPublicoCarrinhoViewModel
}
