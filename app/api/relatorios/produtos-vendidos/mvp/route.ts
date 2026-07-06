import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { montarParamsVendasPdvPeriodo } from '@/src/infrastructure/dashboard/agregarVendasPorProdutoPdv'
import {
  clampIntRelatorio,
  executarRelatorioProdutosVendidosPipeline,
  montarBodyPaginadoFromAgregado,
  normalizeBuscaRelatorio,
  parseOptionalNumberRelatorio,
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
import type { RelatorioSerieGranularidade } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import type {
  ProdutoRankingAnteriorDTO,
  RelatorioProdutosVendidosMvpResponseDTO,
} from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import type { RelatorioProdutosVendidosTotaisFiltradosDTO } from '@/src/shared/types/relatoriosProdutosVendidosApi'

/**
 * GET /api/relatorios/produtos-vendidos/mvp
 *
 * Performance:
 * - Agregação cacheada ~90s por empresa + filtros.
 * - Carga principal: só período atual (`comparativo=0` na 1ª página).
 * - `somenteComparativo=1`: período anterior em 2ª requisição (usa cache do atual).
 * - `somenteParticipacao=1` / `somenteParticipacaoAbc=1` / `somenteSerie=1`: blocos SPA sob demanda.
 * - `participacao=0` / `serie=0` na carga base: lista leve sem gráficos.
 * - `somentePagina=1` + `offset>0`: paginação em memória.
 */
const MAX_DIAS_COMPARATIVO_PERIODO_ANTERIOR = 95

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

function totaisFiltradosFromAgregado(atual: ExecRelatorioProdutosVendidosResult): RelatorioProdutosVendidosTotaisFiltradosDTO {
  return {
    quantidade: atual.sumQtdFiltrado,
    valor: atual.sumValorFiltrado,
  }
}

/** Preenche série no cache na 1ª abertura do painel (SPA). */
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
    const montado = montarSerieTemporal(
      cached.atual,
      args.timezone,
      args.paramsIntervaloPdV
    )
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

/** Só período atual; comparativo vem em `somenteComparativo=1`. */
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || 'hoje'
  const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'
  const sort = parseSortRelatorio(searchParams.get('sort') || 'quantidade_desc')
  const incluirSerie = searchParams.get('serie') === '1'
  const incluirParticipacao = searchParams.get('participacao') === '1'
  const somentePagina = searchParams.get('somentePagina') === '1'
  const somenteComparativo = searchParams.get('somenteComparativo') === '1'
  const somenteParticipacao = searchParams.get('somenteParticipacao') === '1'
  const somenteParticipacaoAbc = searchParams.get('somenteParticipacaoAbc') === '1'
  const somenteSerie = searchParams.get('somenteSerie') === '1'

  const grupoIdsParam = searchParams.get('grupoIds')?.trim()
  const grupoIdSet =
    grupoIdsParam && grupoIdsParam.length > 0
      ? new Set(
          grupoIdsParam
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        )
      : null

  const valorMin = parseOptionalNumberRelatorio(searchParams.get('valorMin'))
  const valorMax = parseOptionalNumberRelatorio(searchParams.get('valorMax'))
  const qtdMin = parseOptionalNumberRelatorio(searchParams.get('qtdMin'))
  const qtdMax = parseOptionalNumberRelatorio(searchParams.get('qtdMax'))
  const qBusca = normalizeBuscaRelatorio(searchParams.get('q'))

  const limit = clampIntRelatorio(searchParams.get('limit'), 50, 1, 200)
  const offset = clampIntRelatorio(searchParams.get('offset'), 0, 0, 50_000)

  const validation = validateRequest(request, { requireEmpresaId: true })
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }
  const { tokenInfo } = validation
  const empresaId = tokenInfo.empresaId!

  const paramsIntervaloPdV = montarParamsVendasPdvPeriodo({
    requestSearchParams: searchParams,
    periodo,
    timezone,
  })

  try {
    const apiClient = new ApiClient()
    const headers = {
      Authorization: `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
    }

    const pipelineBase: PipelineOptsForCache = {
      apiClient,
      headers,
      paramsIntervaloPdV,
      sort,
      grupoIdSet,
      valorMin,
      valorMax,
      qtdMin,
      qtdMax,
      qBusca,
    }

    const cacheKey = buildRelatorioAgregadoCacheKey({
      empresaId,
      paramsIntervaloPdV,
      sort,
      grupoIdsKey: grupoIdsParam ?? '',
      valorMin,
      valorMax,
      qtdMin,
      qtdMax,
      qBusca,
      timezone,
    })

    const intervaloSlot = extrairIntervaloDataFinalizacaoParams(paramsIntervaloPdV)
    const diasPeriodo =
      intervaloSlot != null
        ? diasAbsIntervaloUtc(intervaloSlot.inicioUtc, intervaloSlot.fimUtc)
        : 0

    if (somenteParticipacao) {
      const agregado = await obterAgregadoComCache({
        cacheKey,
        pipelineBase,
        intervaloSlot,
        diasPeriodo,
        timezone,
        incluirSerie: false,
      })

      return NextResponse.json(
        {
          somenteParticipacao: true,
          participacaoGrupos: montarParticipacaoGrupos(
            agregado.atual.linhasFiltradasOrdenadas,
            agregado.atual.sumValorFiltrado
          ),
        },
        { headers: { 'Cache-Control': 'private, max-age=30' } }
      )
    }

    if (somenteParticipacaoAbc) {
      const agregado = await obterAgregadoComCache({
        cacheKey,
        pipelineBase,
        intervaloSlot,
        diasPeriodo,
        timezone,
        incluirSerie: false,
      })

      const { atual } = agregado
      return NextResponse.json(
        {
          somenteParticipacaoAbc: true,
          participacaoAbc: montarParticipacaoAbc(
            atual.linhasFiltradasOrdenadas,
            atual.sumValorFiltrado,
            atual.sumQtdFiltrado
          ),
        },
        { headers: { 'Cache-Control': 'private, max-age=30' } }
      )
    }

    if (somenteSerie) {
      await obterAgregadoComCache({
        cacheKey,
        pipelineBase,
        intervaloSlot,
        diasPeriodo,
        timezone,
        incluirSerie: false,
      })

      const { serieTemporal, serieSimplificada, serieGranularidade } = await garantirSerieNoAgregado({
        cacheKey,
        timezone,
        paramsIntervaloPdV: paramsIntervaloPdV,
      })

      return NextResponse.json(
        {
          somenteSerie: true,
          serieTemporal,
          mockFlags: { serieSimplificada, serieGranularidade },
        },
        { headers: { 'Cache-Control': 'private, max-age=30' } }
      )
    }

    if (somenteComparativo) {
      const agregado =
        (await completarSomenteComparativo({
          cacheKey,
          pipelineBase,
          intervaloSlot,
          diasPeriodo,
        })) ??
        (await obterAgregadoComCache({
          cacheKey,
          pipelineBase,
          intervaloSlot,
          diasPeriodo,
          timezone,
          incluirSerie: false,
        }))

      return NextResponse.json(
        {
          somenteComparativo: true,
          kpis: montarKpisMvp(agregado.atual, agregado.omitirComparativo ? null : agregado.anterior),
          rankingsPorProduto: agregado.rankingCompleto,
          mockFlags: agregado.mockFlags,
        },
        { headers: { 'Cache-Control': 'private, max-age=30' } }
      )
    }

    const agregado = await obterAgregadoComCache({
      cacheKey,
      pipelineBase,
      intervaloSlot,
      diasPeriodo,
      timezone,
      incluirSerie,
    })

    const { atual, anterior, omitirComparativo, mockFlags, serieTemporal, rankingCompleto } = agregado

    const basePagina = montarBodyPaginadoFromAgregado(atual, offset, limit)
    const idsPagina = new Set(basePagina.items.map(i => i.produtoId))
    const rankingsPorProduto = rankingsDaPagina(rankingCompleto, idsPagina)

    if (somentePagina) {
      const bodyLeve: RelatorioProdutosVendidosMvpResponseDTO = {
        ...basePagina,
        kpis: montarKpisMvp(atual, omitirComparativo ? null : anterior),
        participacaoGrupos: [],
        serieTemporal: [],
        rankingsPorProduto,
        mockFlags,
      }
      return NextResponse.json(bodyLeve, {
        headers: { 'Cache-Control': 'private, max-age=30' },
      })
    }

    const body: RelatorioProdutosVendidosMvpResponseDTO = combinarPayloadMvp({
      base: {
        ...basePagina,
        totaisFiltrados: totaisFiltradosFromAgregado(atual),
      },
      kpis: montarKpisMvp(atual, omitirComparativo ? null : anterior),
      participacaoGrupos: incluirParticipacao
        ? montarParticipacaoGrupos(atual.linhasFiltradasOrdenadas, atual.sumValorFiltrado)
        : [],
      serieTemporal: incluirSerie ? serieTemporal : [],
      rankings: rankingsPorProduto,
      mockFlags,
    })

    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    })
  } catch (error) {
    console.error('Erro em /api/relatorios/produtos-vendidos/mvp:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao montar relatório MVP de produtos vendidos.' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno ao montar relatório MVP de produtos vendidos.' },
      { status: 500 }
    )
  }
}
