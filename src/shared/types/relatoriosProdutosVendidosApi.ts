/**
 * Contrato base do relatório de produtos vendidos (itens paginados, ABC, totais).
 * Consumido pelo BFF `GET /api/relatorios/produtos-vendidos/mvp`.
 * Alinhado à visão futura `GET /api/v1/relatorios/top-produtos` (ver docs/dashboard-v2-melhorias-top-produtos.md).
 */

export type RelatorioProdutosVendidosSort =
  | 'quantidade_desc'
  | 'quantidade_asc'
  | 'valor_desc'
  | 'valor_asc'

export type RelatorioProdutoVendidoClasseAbc = 'A' | 'B' | 'C'

export interface RelatorioProdutoVendidoLinhaDTO {
  produtoId: string
  nome: string
  grupoId: string | null
  grupoNome: string | null
  quantidade: number
  valorTotal: number
  precoMedioVenda: number
  percentualFaturamento: number
  percentualUnidades: number
  classeAbc: RelatorioProdutoVendidoClasseAbc
  valorCardapio: number | null
  /** ((precoMedioVenda - valorCardapio) / valorCardapio) * 100; null se sem preço de cardápio. */
  deltaPrecoVsCardapioPercentual: number | null
}

export interface RelatorioProdutosVendidosTotaisDTO {
  quantidadeTotal: number
  valorTotal: number
  skusDistintos: number
}

/** Totais do conjunto após filtros (grupo, busca, faixas) — distinto de `totaisPeriodo` (PDV inteiro). */
export interface RelatorioProdutosVendidosTotaisFiltradosDTO {
  quantidade: number
  valor: number
}

export interface RelatorioProdutosVendidosResponseDTO {
  items: RelatorioProdutoVendidoLinhaDTO[]
  totaisPeriodo: RelatorioProdutosVendidosTotaisDTO
  totaisFiltrados: RelatorioProdutosVendidosTotaisFiltradosDTO
  totalFiltrado: number
  limit: number
  offset: number
}
