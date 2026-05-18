import type { RelatorioProdutosVendidosResponseDTO } from '@/src/shared/types/relatoriosProdutosVendidosApi'

export interface ProdutoSerieValor {
  produtoId: string
  valor: number
  /** Quando disponível no BFF (mini cardápio) — evita segunda busca só para legenda. */
  nome?: string
}

export interface RelatorioProdutosVendidosMvpSerieDiaDTO {
  /** Dia `YYYY-MM-DD` no fuso da empresa */
  dia: string
  valores: ProdutoSerieValor[]
  /** Soma dos valores dos produtos incluídos na série neste dia */
  totalDia: number
}

export interface RelatorioParticipacaoGrupoDTO {
  grupoId: string | null
  key: string
  nomeGrupo: string
  valorTotal: number
  pct: number
}

export interface RelatorioProdutosVendidosMvpKpisDTO {
  faturamentoAtual: number
  faturamentoAnterior: number | null
  variacaoPercentualFat: number | null
  quantidadeVendidaAtual: number
  quantidadeAnterior: number | null
  variacaoPercentualQuantidade: number | null
  /** Faturamento / unidades do período (base PDV inteiro no período) */
  ticketMedioPorItemNoPeriodo: number
  ticketMedioPorItemPeriodoAnterior: number | null
  variacaoPercentualTicketMedio: number | null
  produtoLiderNomeQuantidade: string
  produtoLiderQuantidadeUnidades: number
  produtoLiderPercentualVsPeriodoAnterior: number | null
  produtoComMaiorCrescimentoNome: string | null
  produtoComMaiorCrescimentoPct: number | null
}

export interface ProdutoRankingAnteriorDTO {
  produtoId: string
  nome: string
  variacaoValorPct: number | null
  variacaoQtdPct: number | null
  liderValorNoPeriodo: boolean
  maiorCrescimentoQtdPct: boolean
  liderNomeNoPeriodo?: string
}

export interface RelatorioProdutosVendidosMvpMockFlags {
  serieSimplificada?: boolean
  /** Comparativo vs período anterior omitido (ex.: período muito longo ou sem intervalo definido). */
  comparativoPeriodoAnteriorOmitido?: boolean
}

/** Resposta BFF paralela ao relatório clássico com extras de dashboard MVP. */
export type RelatorioProdutosVendidosMvpResponseDTO = RelatorioProdutosVendidosResponseDTO & {
  kpis: RelatorioProdutosVendidosMvpKpisDTO
  participacaoGrupos: RelatorioParticipacaoGrupoDTO[]
  serieTemporal: RelatorioProdutosVendidosMvpSerieDiaDTO[]
  rankingsPorProduto: ProdutoRankingAnteriorDTO[]
  mockFlags: RelatorioProdutosVendidosMvpMockFlags
}
