export type DeliveryPublicoProdutoViewModel = {
  id: string
  nome: string
  descricao: string | null
  preco: number
  imagemUrl: string | null
  grupoId: string
  /** Quando true, não exibe atalho "+" — deve abrir detalhes. */
  temComplementos: boolean
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
  /** Texto curto de horário (footer / agenda). */
  horarioTexto: string
  /** Mensagem completa de status (topnav): aberto/fechado + próxima abertura. */
  statusMensagem: string
  /** Horário complementar (ex.: "até as 22:45"); null quando não aplica. */
  statusDetalheHorario: string | null
  termoBusca: string
  carrinho: DeliveryPublicoCarrinhoViewModel
}
