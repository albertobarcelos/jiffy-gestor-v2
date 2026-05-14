/**
 * Contrato do BFF `GET /api/relatorios/produtos-vendidos`.
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
  /**
   * Reservado para CMV/custo — hoje null; com `mock=1` o BFF pode preencher valores fictícios
   * até existir fonte no backend.
   */
  margemBrutaPercentual: number | null
}

export interface RelatorioProdutosVendidosTotaisDTO {
  quantidadeTotal: number
  valorTotal: number
  skusDistintos: number
}

export interface RelatorioProdutosVendidosResponseDTO {
  items: RelatorioProdutoVendidoLinhaDTO[]
  totaisPeriodo: RelatorioProdutosVendidosTotaisDTO
  totalFiltrado: number
  limit: number
  offset: number
  /** Quando true, `margemBrutaPercentual` pode vir preenchida com mock. */
  mockAtivo: boolean
}
