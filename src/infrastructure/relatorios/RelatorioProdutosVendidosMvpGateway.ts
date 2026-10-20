import type { ConsultarRelatorioProdutosVendidosMvpInput } from '@/src/application/dto/relatorios/ConsultarRelatorioProdutosVendidosMvpDTO'
import type { IRelatorioProdutosVendidosMvpGateway } from '@/src/application/ports/IRelatorioProdutosVendidosMvpGateway'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { montarParamsVendasPdvPeriodo } from '@/src/infrastructure/dashboard/agregarVendasPorProdutoPdv'
import {
  executarRelatorioProdutosVendidosPipeline,
  montarBodyPaginadoFromAgregado,
  parseSortRelatorio,
  type ExecRelatorioProdutosVendidosResult,
} from '@/src/infrastructure/relatorios/montarRelatorioProdutosVendidos'
import {
  combinarPayloadMvp,
  montarKpisMvp,
  montarParticipacaoAbc,
  montarParticipacaoGrupos,
  montarRankingEVariacoes,
} from '@/src/infrastructure/relatorios/montarRelatorioProdutosVendidosMvpPayload'
import {
  agregarComplementosVendidos,
  filtrarEOrdenarComplementos,
  montarKpisComplementos,
} from '@/src/infrastructure/relatorios/agregarComplementosVendidos'
import { enriquecerNomesGruposComplemento } from '@/src/infrastructure/relatorios/enriquecerNomesGruposComplemento'
import {
  buildRelatorioAgregadoCacheKey,
  getRelatorioAgregadoCache,
  obterRelatorioAgregadoComSingleFlight,
  setRelatorioAgregadoCache,
  type PipelineOptsForCache,
  type RelatorioAgregadoCacheEntry,
} from '@/src/infrastructure/relatorios/relatorioProdutosVendidosAgregadoCache'
import {
  extrairIntervaloDataFinalizacaoParams,
  novoParamsIntervaloPdv,
  periodoRelatorioSlidingAnterior,
} from '@/src/infrastructure/relatorios/periodoRelatorioDeslizante'
import {
  computarSerieValorProdutosFiltrados,
  resolverGranularidadeSerie,
  resolverTopProdutoIdsPorValor,
} from '@/src/infrastructure/relatorios/serieDiariaProdutosVendidos'
import type { RelatorioProdutosVendidosTotaisFiltradosDTO } from '@/src/shared/types/relatoriosProdutosVendidosApi'
import type {
  ProdutoRankingAnteriorDTO,
  RelatorioProdutosVendidosMvpComparativoDTO,
  RelatorioProdutosVendidosMvpComplementosDTO,
  RelatorioProdutosVendidosMvpParticipacaoAbcDTO,
  RelatorioProdutosVendidosMvpParticipacaoDTO,
  RelatorioProdutosVendidosMvpResponseDTO,
  RelatorioProdutosVendidosMvpSerieDTO,
  RelatorioSerieGranularidade,
} from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'

const MAX_DIAS_COMPARATIVO_PERIODO_ANTERIOR = 95

type ContextoConsultaMvp = {
  input: ConsultarRelatorioProdutosVendidosMvpInput
  apiClient: ApiClient
  headers: { Authorization: string; 'Content-Type': string }
  pipelineBase: PipelineOptsForCache
  cacheKey: string
  paramsIntervaloPdV: URLSearchParams
  intervaloSlot: { inicioUtc: Date; fimUtc: Date } | null
  diasPeriodo: number
  timezone: string
  sort: ReturnType<typeof parseSortRelatorio>
}

function parseIdSet(raw: string): Set<string> | null {
  if (!raw) return null
  const ids = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return ids.length > 0 ? new Set(ids) : null
}

function diasAbsIntervaloUtc(a: Date, b: Date): number {
  return Math.ceil(Math.abs(b.getTime() - a.getTime()) / 86_400_000)
}

function montarSerieTemporal(
  atual: ExecRelatorioProdutosVendidosResult,
  timezone: string,
  paramsIntervaloPdV: URLSearchParams
): {
  serie: RelatorioProdutosVendidosMvpResponseDTO['serieTemporal']
  granularidade: RelatorioSerieGranularidade
} {
  if (atual.detalhes.length === 0) {
    return { serie: [], granularidade: resolverGranularidadeSerie(paramsIntervaloPdV, timezone) }
  }
  const topIds = resolverTopProdutoIdsPorValor(
    atual.linhasFiltradasOrdenadas.map(r => ({
      produtoId: r.produtoId,
      valorTotal: r.valorTotal,
    }))
  )
  const nomePorId = new Map<string, string>()
  for (const [id, mini] of atual.miniMap.entries()) {
    const n = mini?.nome?.trim()
    if (n) nomePorId.set(id, n)
  }
  const granularidade = resolverGranularidadeSerie(paramsIntervaloPdV, timezone)
  const { serie } = computarSerieValorProdutosFiltrados(
    atual.detalhes,
    timezone,
    topIds,
    { granularidade, paramsIntervaloPdV },
    nomePorId
  )
  return { serie, granularidade }
}

function calcularRanking(
  atual: ExecRelatorioProdutosVendidosResult,
  anterior: ExecRelatorioProdutosVendidosResult | null,
  omitirComparativo: boolean
): ProdutoRankingAnteriorDTO[] {
  return montarRankingEVariacoes(
    atual.linhasFiltradasOrdenadas,
    omitirComparativo || !anterior ? null : anterior.linhasFiltradasOrdenadas
  )
}

function rankingsDaPagina(
  rankingCompleto: ProdutoRankingAnteriorDTO[],
  produtoIds: Set<string>
): ProdutoRankingAnteriorDTO[] {
  return rankingCompleto.filter(r => produtoIds.has(r.produtoId))
}

async function executarPipelineAnterior(args: {
  pipelineBase: PipelineOptsForCache
  intervaloSlot: { inicioUtc: Date; fimUtc: Date }
}): Promise<ExecRelatorioProdutosVendidosResult> {
  const { inicioUtc, fimUtc } = periodoRelatorioSlidingAnterior(
    args.intervaloSlot.inicioUtc,
    args.intervaloSlot.fimUtc
  )
  const paramsAnt = novoParamsIntervaloPdv(inicioUtc.toISOString(), fimUtc.toISOString())
  return executarRelatorioProdutosVendidosPipeline({
    ...args.pipelineBase,
    paramsIntervaloPdV: paramsAnt,
    limit: 50,
    offset: 0,
  })
}

async function carregarPeriodoAtual(args: {
  pipelineBase: PipelineOptsForCache
  incluirSerie: boolean
  timezone: string
}): Promise<{
  atual: ExecRelatorioProdutosVendidosResult
  serieTemporal: RelatorioProdutosVendidosMvpResponseDTO['serieTemporal']
  serieSimplificada: boolean
  serieGranularidade: RelatorioSerieGranularidade
}> {
  const atual = await executarRelatorioProdutosVendidosPipeline({
    ...args.pipelineBase,
    limit: 50,
    offset: 0,
  })

  let serieTemporal: RelatorioProdutosVendidosMvpResponseDTO['serieTemporal'] = []
  let serieSimplificada = false
  let serieGranularidade = resolverGranularidadeSerie(
    args.pipelineBase.paramsIntervaloPdV,
    args.timezone
  )

  if (args.incluirSerie && atual.detalhes.length > 0) {
    const montado = montarSerieTemporal(atual, args.timezone, args.pipelineBase.paramsIntervaloPdV)
    serieTemporal = montado.serie
    serieGranularidade = montado.granularidade
    if (
      serieTemporal.length === 0 &&
      atual.linhasFiltradasOrdenadas.length > 0 &&
      atual.valorTotalPeriodoVendas > 0
    ) {
      serieSimplificada = true
    }
  }

  return { atual, serieTemporal, serieSimplificada, serieGranularidade }
}

function totaisFiltradosFromAgregado(
  atual: ExecRelatorioProdutosVendidosResult
): RelatorioProdutosVendidosTotaisFiltradosDTO {
  return {
    quantidade: atual.sumQtdFiltrado,
    valor: atual.sumValorFiltrado,
  }
}

async function garantirSerieNoAgregado(args: {
  cacheKey: string
  timezone: string
  paramsIntervaloPdV: URLSearchParams
}): Promise<{
  serieTemporal: RelatorioProdutosVendidosMvpResponseDTO['serieTemporal']
  serieSimplificada: boolean
  serieGranularidade: RelatorioSerieGranularidade
}> {
  const cached = getRelatorioAgregadoCache(args.cacheKey)
  if (!cached) {
    return { serieTemporal: [], serieSimplificada: false, serieGranularidade: 'dia' }
  }

  if (cached.serieTemporal.length > 0) {
    return {
      serieTemporal: cached.serieTemporal,
      serieSimplificada: cached.mockFlags.serieSimplificada ?? false,
      serieGranularidade: cached.mockFlags.serieGranularidade ?? 'dia',
    }
  }

  let serieTemporal: RelatorioProdutosVendidosMvpResponseDTO['serieTemporal'] = []
  let serieSimplificada = false
  let serieGranularidade: RelatorioSerieGranularidade = 'dia'

  if (cached.atual.detalhes.length > 0) {
    const montado = montarSerieTemporal(cached.atual, args.timezone, args.paramsIntervaloPdV)
    serieTemporal = montado.serie
    serieGranularidade = montado.granularidade
    if (
      serieTemporal.length === 0 &&
      cached.atual.linhasFiltradasOrdenadas.length > 0 &&
      cached.atual.valorTotalPeriodoVendas > 0
    ) {
      serieSimplificada = true
    }
  }

  setRelatorioAgregadoCache(args.cacheKey, {
    ...cached,
    serieTemporal,
    mockFlags: {
      ...cached.mockFlags,
      serieSimplificada,
      serieGranularidade,
    },
  })

  return { serieTemporal, serieSimplificada, serieGranularidade }
}

async function obterAgregadoComCache(args: {
  cacheKey: string
  pipelineBase: PipelineOptsForCache
  intervaloSlot: { inicioUtc: Date; fimUtc: Date } | null
  diasPeriodo: number
  timezone: string
  incluirSerie: boolean
}): Promise<RelatorioAgregadoCacheEntry> {
  return obterRelatorioAgregadoComSingleFlight(args.cacheKey, async () => {
    const loaded = await carregarPeriodoAtual({
      pipelineBase: args.pipelineBase,
      incluirSerie: args.incluirSerie,
      timezone: args.timezone,
    })

    const omitirComparativo =
      args.intervaloSlot == null ||
      args.diasPeriodo > MAX_DIAS_COMPARATIVO_PERIODO_ANTERIOR ||
      loaded.atual.valorTotalPeriodoVendas <= 0

    const rankingCompleto = calcularRanking(loaded.atual, null, true)

    const entry: Omit<RelatorioAgregadoCacheEntry, 'expiresAt'> = {
      atual: loaded.atual,
      anterior: null,
      omitirComparativo,
      comparativoPronto: omitirComparativo,
      mockFlags: {
        serieSimplificada: loaded.serieSimplificada,
        serieGranularidade: loaded.serieGranularidade,
        comparativoPeriodoAnteriorOmitido: omitirComparativo,
      },
      serieTemporal: loaded.serieTemporal,
      rankingCompleto,
    }

    setRelatorioAgregadoCache(args.cacheKey, entry)
    const stored = getRelatorioAgregadoCache(args.cacheKey)
    if (!stored) throw new Error('Falha ao gravar cache do relatório de produtos vendidos.')
    return stored
  })
}

async function completarSomenteComparativo(args: {
  cacheKey: string
  pipelineBase: PipelineOptsForCache
  intervaloSlot: { inicioUtc: Date; fimUtc: Date } | null
  diasPeriodo: number
}): Promise<RelatorioAgregadoCacheEntry | null> {
  const cached = getRelatorioAgregadoCache(args.cacheKey)
  if (!cached) return null
  if (cached.comparativoPronto) return cached

  let omitirComparativo =
    args.intervaloSlot == null ||
    args.diasPeriodo > MAX_DIAS_COMPARATIVO_PERIODO_ANTERIOR ||
    cached.atual.valorTotalPeriodoVendas <= 0

  let anterior: ExecRelatorioProdutosVendidosResult | null = null

  if (!omitirComparativo && args.intervaloSlot) {
    anterior = await executarPipelineAnterior({
      pipelineBase: args.pipelineBase,
      intervaloSlot: args.intervaloSlot,
    })
  } else {
    omitirComparativo = true
  }

  const rankingCompleto = calcularRanking(cached.atual, anterior, omitirComparativo)

  setRelatorioAgregadoCache(args.cacheKey, {
    ...cached,
    anterior,
    omitirComparativo,
    comparativoPronto: true,
    mockFlags: {
      ...cached.mockFlags,
      comparativoPeriodoAnteriorOmitido: omitirComparativo,
    },
    rankingCompleto,
  })

  return getRelatorioAgregadoCache(args.cacheKey)
}

function prepararContexto(input: ConsultarRelatorioProdutosVendidosMvpInput): ContextoConsultaMvp {
  const apiClient = new ApiClient()
  const headers = {
    Authorization: `Bearer ${input.token}`,
    'Content-Type': 'application/json',
  }
  const sort = parseSortRelatorio(input.sortRaw || 'quantidade_desc')
  const paramsIntervaloPdV = montarParamsVendasPdvPeriodo({
    requestSearchParams: input.searchParams,
    periodo: input.periodo,
    timezone: input.timezone,
  })
  const pipelineBase: PipelineOptsForCache = {
    apiClient,
    headers,
    paramsIntervaloPdV,
    sort,
    grupoIdSet: parseIdSet(input.grupoIdsParam),
    valorMin: input.valorMin,
    valorMax: input.valorMax,
    qtdMin: input.qtdMin,
    qtdMax: input.qtdMax,
    qBusca: input.qBusca,
  }
  const cacheKey = buildRelatorioAgregadoCacheKey({
    empresaId: input.empresaId,
    paramsIntervaloPdV,
    sort,
    grupoIdsKey: input.grupoIdsParam,
    valorMin: input.valorMin,
    valorMax: input.valorMax,
    qtdMin: input.qtdMin,
    qtdMax: input.qtdMax,
    qBusca: input.qBusca,
    timezone: input.timezone,
  })
  const intervaloSlot = extrairIntervaloDataFinalizacaoParams(paramsIntervaloPdV)
  const diasPeriodo =
    intervaloSlot != null ? diasAbsIntervaloUtc(intervaloSlot.inicioUtc, intervaloSlot.fimUtc) : 0

  return {
    input,
    apiClient,
    headers,
    pipelineBase,
    cacheKey,
    paramsIntervaloPdV,
    intervaloSlot,
    diasPeriodo,
    timezone: input.timezone,
    sort,
  }
}

function obterAgregadoDoContexto(
  ctx: ContextoConsultaMvp,
  opts: { incluirSerie: boolean; cacheKey?: string; pipelineBase?: PipelineOptsForCache }
): Promise<RelatorioAgregadoCacheEntry> {
  return obterAgregadoComCache({
    cacheKey: opts.cacheKey ?? ctx.cacheKey,
    pipelineBase: opts.pipelineBase ?? ctx.pipelineBase,
    intervaloSlot: ctx.intervaloSlot,
    diasPeriodo: ctx.diasPeriodo,
    timezone: ctx.timezone,
    incluirSerie: opts.incluirSerie,
  })
}

export class RelatorioProdutosVendidosMvpGateway implements IRelatorioProdutosVendidosMvpGateway {
  async consultarComplementos(
    input: ConsultarRelatorioProdutosVendidosMvpInput
  ): Promise<RelatorioProdutosVendidosMvpComplementosDTO> {
    const ctx = prepararContexto(input)
    const cacheKeyComplementos = buildRelatorioAgregadoCacheKey({
      empresaId: input.empresaId,
      paramsIntervaloPdV: ctx.paramsIntervaloPdV,
      sort: ctx.sort,
      grupoIdsKey: '',
      valorMin: null,
      valorMax: null,
      qtdMin: null,
      qtdMax: null,
      qBusca: null,
      timezone: input.timezone,
    })
    const agregado = await obterAgregadoDoContexto(ctx, {
      incluirSerie: false,
      cacheKey: cacheKeyComplementos,
      pipelineBase: {
        ...ctx.pipelineBase,
        grupoIdSet: null,
        valorMin: null,
        valorMax: null,
        qtdMin: null,
        qtdMax: null,
        qBusca: null,
      },
    })

    const brutas = agregarComplementosVendidos(agregado.atual.detalhes)
    const enriquecidas = await enriquecerNomesGruposComplemento({
      apiClient: ctx.apiClient,
      headers: ctx.headers,
      linhas: brutas,
    })
    const items = filtrarEOrdenarComplementos(enriquecidas, {
      qBusca: input.qBusca,
      impacto: input.impactoComplemento,
      sort: input.sortRaw || 'quantidade_desc',
      grupoComplementoIdSet: parseIdSet(input.grupoComplementoIdsParam),
      valorMin: input.valorMin,
      valorMax: input.valorMax,
      qtdMin: input.qtdMin,
      qtdMax: input.qtdMax,
    })

    return {
      somenteComplementos: true,
      items,
      kpis: montarKpisComplementos(items),
      totalFiltrado: items.length,
    }
  }

  async consultarParticipacao(
    input: ConsultarRelatorioProdutosVendidosMvpInput
  ): Promise<RelatorioProdutosVendidosMvpParticipacaoDTO> {
    const ctx = prepararContexto(input)
    const agregado = await obterAgregadoDoContexto(ctx, { incluirSerie: false })
    return {
      somenteParticipacao: true,
      participacaoGrupos: montarParticipacaoGrupos(
        agregado.atual.linhasFiltradasOrdenadas,
        agregado.atual.sumValorFiltrado
      ),
    }
  }

  async consultarParticipacaoAbc(
    input: ConsultarRelatorioProdutosVendidosMvpInput
  ): Promise<RelatorioProdutosVendidosMvpParticipacaoAbcDTO> {
    const ctx = prepararContexto(input)
    const { atual } = await obterAgregadoDoContexto(ctx, { incluirSerie: false })
    return {
      somenteParticipacaoAbc: true,
      participacaoAbc: montarParticipacaoAbc(
        atual.linhasFiltradasOrdenadas,
        atual.sumValorFiltrado,
        atual.sumQtdFiltrado
      ),
    }
  }

  async consultarSerie(
    input: ConsultarRelatorioProdutosVendidosMvpInput
  ): Promise<RelatorioProdutosVendidosMvpSerieDTO> {
    const ctx = prepararContexto(input)
    await obterAgregadoDoContexto(ctx, { incluirSerie: false })
    const { serieTemporal, serieSimplificada, serieGranularidade } = await garantirSerieNoAgregado({
      cacheKey: ctx.cacheKey,
      timezone: ctx.timezone,
      paramsIntervaloPdV: ctx.paramsIntervaloPdV,
    })
    return {
      somenteSerie: true,
      serieTemporal,
      mockFlags: { serieSimplificada, serieGranularidade },
    }
  }

  async consultarComparativo(
    input: ConsultarRelatorioProdutosVendidosMvpInput
  ): Promise<RelatorioProdutosVendidosMvpComparativoDTO> {
    const ctx = prepararContexto(input)
    const agregado =
      (await completarSomenteComparativo({
        cacheKey: ctx.cacheKey,
        pipelineBase: ctx.pipelineBase,
        intervaloSlot: ctx.intervaloSlot,
        diasPeriodo: ctx.diasPeriodo,
      })) ?? (await obterAgregadoDoContexto(ctx, { incluirSerie: false }))

    return {
      somenteComparativo: true,
      kpis: montarKpisMvp(agregado.atual, agregado.omitirComparativo ? null : agregado.anterior),
      rankingsPorProduto: agregado.rankingCompleto,
      mockFlags: agregado.mockFlags,
    }
  }

  async consultarPaginaOuPrincipal(
    input: ConsultarRelatorioProdutosVendidosMvpInput
  ): Promise<RelatorioProdutosVendidosMvpResponseDTO> {
    const ctx = prepararContexto(input)
    const agregado = await obterAgregadoDoContexto(ctx, { incluirSerie: input.incluirSerie })
    const { atual, anterior, omitirComparativo, mockFlags, serieTemporal, rankingCompleto } =
      agregado

    const basePagina = montarBodyPaginadoFromAgregado(atual, input.offset, input.limit)
    const idsPagina = new Set(basePagina.items.map(i => i.produtoId))
    const rankingsPorProduto = rankingsDaPagina(rankingCompleto, idsPagina)

    if (input.somentePagina) {
      return {
        ...basePagina,
        kpis: montarKpisMvp(atual, omitirComparativo ? null : anterior),
        participacaoGrupos: [],
        serieTemporal: [],
        rankingsPorProduto,
        mockFlags,
      }
    }

    return combinarPayloadMvp({
      base: {
        ...basePagina,
        totaisFiltrados: totaisFiltradosFromAgregado(atual),
      },
      kpis: montarKpisMvp(atual, omitirComparativo ? null : anterior),
      participacaoGrupos: input.incluirParticipacao
        ? montarParticipacaoGrupos(atual.linhasFiltradasOrdenadas, atual.sumValorFiltrado)
        : [],
      serieTemporal: input.incluirSerie ? serieTemporal : [],
      rankings: rankingsPorProduto,
      mockFlags,
    })
  }
}
