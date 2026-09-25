import type {
  RelatorioComplementoImpacto,
  RelatorioProdutosVendidosMvpComparativoDTO,
  RelatorioProdutosVendidosMvpComplementosDTO,
  RelatorioProdutosVendidosMvpParticipacaoAbcDTO,
  RelatorioProdutosVendidosMvpParticipacaoDTO,
  RelatorioProdutosVendidosMvpResponseDTO,
  RelatorioProdutosVendidosMvpSerieDTO,
} from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'

export type ConsultarRelatorioProdutosVendidosMvpInput = {
  empresaId: string
  token: string
  periodo: string
  timezone: string
  sortRaw: string
  incluirSerie: boolean
  incluirParticipacao: boolean
  somentePagina: boolean
  somenteComparativo: boolean
  somenteParticipacao: boolean
  somenteParticipacaoAbc: boolean
  somenteSerie: boolean
  somenteComplementos: boolean
  impactoComplemento: RelatorioComplementoImpacto | 'todos'
  grupoIdsParam: string
  grupoComplementoIdsParam: string
  valorMin: number | null
  valorMax: number | null
  qtdMin: number | null
  qtdMax: number | null
  qBusca: string | null
  limit: number
  offset: number
  searchParams: URLSearchParams
}

export type ConsultarRelatorioProdutosVendidosMvpResult =
  | RelatorioProdutosVendidosMvpComplementosDTO
  | RelatorioProdutosVendidosMvpParticipacaoDTO
  | RelatorioProdutosVendidosMvpParticipacaoAbcDTO
  | RelatorioProdutosVendidosMvpSerieDTO
  | RelatorioProdutosVendidosMvpComparativoDTO
  | RelatorioProdutosVendidosMvpResponseDTO
