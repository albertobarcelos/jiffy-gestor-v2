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
