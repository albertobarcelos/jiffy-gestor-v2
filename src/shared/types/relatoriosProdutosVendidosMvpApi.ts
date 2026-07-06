import type {
  RelatorioProdutoVendidoClasseAbc,
  RelatorioProdutosVendidosResponseDTO,
} from '@/src/shared/types/relatoriosProdutosVendidosApi'

export interface ProdutoSerieValor {
  produtoId: string
  valor: number
  /** Quando disponível no BFF (mini cardápio) — evita segunda busca só para legenda. */
  nome?: string
}

export type RelatorioSerieGranularidade = 'dia' | 'hora'

export interface RelatorioProdutosVendidosMvpSerieDiaDTO {
  /** Bucket no fuso da empresa: `YYYY-MM-DD` (dia) ou `YYYY-MM-DDTHH` (hora, HH 00–23). */
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

/** Agregação por classe ABC (curva de Pareto no faturamento filtrado). */
export interface RelatorioParticipacaoAbcDTO {
  classe: RelatorioProdutoVendidoClasseAbc
  qtdProdutos: number
  pctProdutos: number
  valorTotal: number
  pctFaturamento: number
  quantidade: number
  pctUnidades: number
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
  /** SKUs distintos após filtros (mesmo recorte da tabela). */
  produtosDistintosAtual: number
  produtosDistintosAnterior: number | null
  variacaoPercentualProdutosDistintos: number | null
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
  /** `hora` quando o período filtrado é um único dia civil (ex.: Hoje). */
  serieGranularidade?: RelatorioSerieGranularidade
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

/** 2ª fase: só KPIs comparativos + rankings (após `comparativo=0`). */
export type RelatorioProdutosVendidosMvpComparativoDTO = {
  somenteComparativo: true
  kpis: RelatorioProdutosVendidosMvpKpisDTO
  rankingsPorProduto: ProdutoRankingAnteriorDTO[]
  mockFlags: RelatorioProdutosVendidosMvpMockFlags
}

/** Bloco SPA: participação por grupo (`somenteParticipacao=1`). */
export type RelatorioProdutosVendidosMvpParticipacaoDTO = {
  somenteParticipacao: true
  participacaoGrupos: RelatorioParticipacaoGrupoDTO[]
}

/** Bloco SPA: distribuição ABC (`somenteParticipacaoAbc=1`). */
export type RelatorioProdutosVendidosMvpParticipacaoAbcDTO = {
  somenteParticipacaoAbc: true
  participacaoAbc: RelatorioParticipacaoAbcDTO[]
}

/** Bloco SPA: série temporal (`somenteSerie=1`). */
export type RelatorioProdutosVendidosMvpSerieDTO = {
  somenteSerie: true
  serieTemporal: RelatorioProdutosVendidosMvpSerieDiaDTO[]
  mockFlags: Pick<RelatorioProdutosVendidosMvpMockFlags, 'serieSimplificada' | 'serieGranularidade'>
}
