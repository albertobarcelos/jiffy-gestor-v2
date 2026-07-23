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
  /** Cor hex do ícone do grupo (catálogo público). */
  cor?: string | null
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
  termoBusca: string
  carrinho: DeliveryPublicoCarrinhoViewModel
}
