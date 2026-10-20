export type MotivoInvalidacaoCatalogoVenda =
  | {
      tipo: 'produto-campos-simples'
      produtoId: string
      grupoProdutoId?: string
      menuIds?: string[]
    }
  | {
      tipo: 'produto-estrutura'
      produtoId: string
      grupoProdutoId?: string
      menuIds?: string[]
      grupoComplementoIds?: string[]
    }
  | { tipo: 'produto-removido'; produtoId: string; menuIds?: string[] }
  | { tipo: 'vinculo-menu'; produtoId: string; menuIds?: string[] }
  | { tipo: 'complemento'; complementoId?: string }
  | { tipo: 'grupo-complemento'; grupoComplementoId?: string }
  | { tipo: 'cardapio'; menuId?: string }
  | {
      tipo: 'categoria'
      menuId?: string
      grupoProdutoId?: string
      produtoId?: string
    }
  | { tipo: 'ordem-produtos'; menuId?: string }
  | { tipo: 'ordem-categorias'; menuId?: string }
  | { tipo: 'imagem-produto'; produtoId: string; menuIds?: string[] }

export type LimpezaCacheGruposCatalogo =
  | { modo: 'nenhum' }
  | { modo: 'todos' }
  | { modo: 'ids'; ids: string[] }
  | { modo: 'complemento'; complementoId: string }

export type AvisoHidratacaoCatalogoVenda = {
  limparTodos?: boolean
  produtoIds?: string[]
  grupoComplementoIds?: string[]
  complementoId?: string
}

export type PlanoInvalidacaoCatalogoVenda = {
  invalidarProdutosPorGrupo: boolean
  invalidarBusca: boolean
  invalidarMenuGrupos: boolean
  menuIds: string[]
  grupoProdutoIds: string[]
  hidratacao: AvisoHidratacaoCatalogoVenda
  cacheGrupos: LimpezaCacheGruposCatalogo
}
