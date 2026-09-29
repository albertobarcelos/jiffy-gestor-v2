export const ACOES_CARDAPIO = ['VINCULAR', 'CRIAR', 'IGNORAR'] as const
export type AcaoCardapio = (typeof ACOES_CARDAPIO)[number]
export type AcaoProdutoCardapio = Exclude<AcaoCardapio, 'IGNORAR'> | null

export type ItemCanalResumo = {
  idItem: string
  sku: string | null
  nome: string
  preco: number | null
}

export type CategoriaCanalResumo = {
  idCategoria: string
  nome: string
}

export type CategoriaCardapioMarketplace = {
  grupoId: string
  nome: string
  acao: AcaoProdutoCardapio
  vinculo: CategoriaCanalResumo | null
  sugestao: CategoriaCanalResumo | null
}

export type ProdutoCardapioMarketplace = {
  produtoId: string
  nome: string
  descricao: string | null
  preco: number
  grupoId: string | null
  grupoNome: string | null
  categoriaId: string | null
  acao: AcaoProdutoCardapio
  vinculo: ItemCanalResumo | null
  sugestao: ItemCanalResumo | null
}

export const SITUACOES_CARDAPIO_REMOTO = [
  'COM_ITENS',
  'SEM_CATEGORIA',
  'SEM_ITENS',
  'FILTRO_SEM_RESULTADO',
] as const
export type SituacaoCardapioRemoto = (typeof SITUACOES_CARDAPIO_REMOTO)[number]

export type SituacaoCardapioAiqfome = {
  vazio: boolean
  situacao: SituacaoCardapioRemoto
  mensagem: string
  podeCriar: boolean
  totalCategorias: number
  totalItens: number
}

export type ItemCardapioRemoto = {
  idItem: string
  sku: string | null
  nome: string
  descricao: string | null
  preco: number | null
  categoriaId: string | null
}

export type ItemAplicarCardapio = {
  produtoId: string
  acao: AcaoCardapio
  idItem?: string | null
  sku?: string | null
  categoriaId?: string | null
}

export type ResultadoAplicarCardapio = {
  produtoId: string
  acao: AcaoCardapio
  salvo: boolean
  sku?: string
  idItem?: string
  precoAtualizado?: boolean
  erro?: string
}

export type ItemAplicarCategoria = {
  grupoId: string
  acao: AcaoCardapio
  categoriaId?: string | null
}

export type PagamentoCanalResumo = {
  idPagamento: string
  nome: string
}

export type PagamentoCardapioMarketplace = {
  meioId: string
  nome: string
  acao: AcaoProdutoCardapio
  vinculo: PagamentoCanalResumo | null
  sugestao: PagamentoCanalResumo | null
}

export type ItemAplicarPagamento = {
  meioId: string
  acao: AcaoCardapio
  pagamentoId?: string | null
}

export type ResultadoAplicarPagamento = {
  meioId: string
  acao: AcaoCardapio
  salvo: boolean
  pagamentoId?: string
  erro?: string
}

export type ResultadoAplicarCategoria = {
  grupoId: string
  acao: AcaoCardapio
  salvo: boolean
  categoriaId?: string
  erro?: string
}

export type ItemImportarCardapio = {
  idItem: string
  nome: string
  descricao?: string | null
  preco: number
  sku?: string | null
}

export type ResultadoImportarCardapio = {
  idItem: string
  criado: boolean
  produtoId?: string
  sku?: string
  motivo?: string
  erro?: string
}

export function ehAcaoCardapio(value: unknown): value is AcaoCardapio {
  return typeof value === 'string' && (ACOES_CARDAPIO as readonly string[]).includes(value)
}
