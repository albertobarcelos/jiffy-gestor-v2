import type {
  CategoriaCanalResumo,
  CategoriaCardapioMarketplace,
  ItemAplicarCardapio,
  ItemAplicarCategoria,
  ItemAplicarPagamento,
  ItemCardapioRemoto,
  ItemImportarCardapio,
  ProdutoCardapioMarketplace,
  ResultadoAplicarCardapio,
  ResultadoAplicarCategoria,
  ResultadoAplicarPagamento,
  ResultadoImportarCardapio,
  PagamentoCanalResumo,
  PagamentoCardapioMarketplace,
  SituacaoCardapioAiqfome,
} from '@/src/domain/integracoes/cardapioMarketplace'

export type SessaoCardapioHub = {
  empresaId: string
  authorization: string
}

export type ListaProdutosCardapio = SituacaoCardapioAiqfome & {
  empresaId: string
  menuId: string
  produtos: ProdutoCardapioMarketplace[]
}

export type ListaCardapioRemoto = SituacaoCardapioAiqfome & {
  empresaId: string
  itens: ItemCardapioRemoto[]
}

export type ListaCategoriasCardapio = {
  empresaId: string
  menuId: string
  categorias: CategoriaCardapioMarketplace[]
  remoto: CategoriaCanalResumo[]
}

export type ListaPagamentosCardapio = {
  empresaId: string
  pagamentos: PagamentoCardapioMarketplace[]
  remoto: PagamentoCanalResumo[]
}

/**
 * Cardápio do canal no mesmo hub da conexão.
 * GET só lê; aplicar/importar grava.
 */
export interface ICardapioMarketplaceHub {
  listarProdutos(input: SessaoCardapioHub & { menuId: string }): Promise<ListaProdutosCardapio>
  listarRemoto(input: SessaoCardapioHub & { busca?: string }): Promise<ListaCardapioRemoto>
  listarCategorias(input: SessaoCardapioHub & { menuId: string }): Promise<ListaCategoriasCardapio>
  aplicar(input: SessaoCardapioHub & { menuId: string; itens: ItemAplicarCardapio[] }): Promise<{
    resultados: ResultadoAplicarCardapio[]
  }>
  aplicarCategorias(input: SessaoCardapioHub & { menuId: string; itens: ItemAplicarCategoria[] }): Promise<{
    resultados: ResultadoAplicarCategoria[]
  }>
  listarPagamentos(input: SessaoCardapioHub): Promise<ListaPagamentosCardapio>
  aplicarPagamentos(input: SessaoCardapioHub & { itens: ItemAplicarPagamento[] }): Promise<{
    resultados: ResultadoAplicarPagamento[]
  }>
  importar(input: SessaoCardapioHub & {
    menuId: string
    grupoId?: string | null
    itens: ItemImportarCardapio[]
  }): Promise<{ resultados: ResultadoImportarCardapio[] }>
}
