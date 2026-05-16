import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { montarParamsVendasPdvPeriodo } from '@/src/infrastructure/dashboard/agregarVendasPorProdutoPdv'
import {
  clampIntRelatorio,
  executarRelatorioProdutosVendidosPipeline,
  normalizeBuscaRelatorio,
  parseOptionalNumberRelatorio,
  parseSortRelatorio,
  type ExecRelatorioProdutosVendidosResult,
} from '@/src/infrastructure/relatorios/montarRelatorioProdutosVendidos'
import {
  combinarPayloadMvp,
  montarKpisMvp,
  montarParticipacaoGrupos,
  montarRankingEVariacoes,
} from '@/src/infrastructure/relatorios/montarRelatorioProdutosVendidosMvpPayload'
import {
  extrairIntervaloDataFinalizacaoParams,
  novoParamsIntervaloPdv,
  periodoRelatorioSlidingAnterior,
} from '@/src/infrastructure/relatorios/periodoRelatorioDeslizante'
import {
  computarSerieDiariaValorProdutosFiltrados,
  resolverTopProdutoIdsPorValor,
} from '@/src/infrastructure/relatorios/serieDiariaProdutosVendidos'
import type { RelatorioProdutosVendidosMvpResponseDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'

/**
 * GET /api/relatorios/produtos-vendidos/mvp
 *
 * Resposta estendida (KPIs, participação por grupo, série dia-a-dia dos top produtos por valor,
 * rankings página atual vs período anterior). Contrato paralelo ao relatório clássico (`items`,
 * paginação, totais ABC inalterados no corpo base).
 *
 * Query extra:
 * - `serie=0` desativa a série temporal (menos CPU no BFF mantendo KPIs/participação).
 *
 * Comparativo vs período imediatamente anterior (mesma duração) é omitido quando o período
 * cobre mais de ~95 dias corridos ou quando não há datas no intervalo efetivo.
 */
const MAX_DIAS_COMPARATIVO_PERIODO_ANTERIOR = 95

function diasAbsIntervaloUtc(a: Date, b: Date): number {
  return Math.ceil(Math.abs(b.getTime() - a.getTime()) / 86_400_000)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || 'hoje'
  const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'
  const sort = parseSortRelatorio(searchParams.get('sort') || 'quantidade_desc')
  const incluirSerie = searchParams.get('serie') !== '0'

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

  const mockAtivo = searchParams.get('mock') === '1'

  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }
  const { tokenInfo } = validation

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

    const pipelineOpts = {
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
      limit,
      offset,
      mockAtivo,
    }

    const atual = await executarRelatorioProdutosVendidosPipeline(pipelineOpts)

    const intervaloSlot = extrairIntervaloDataFinalizacaoParams(paramsIntervaloPdV)
    let diasPeriodo = 0
    if (intervaloSlot) {
      diasPeriodo = diasAbsIntervaloUtc(intervaloSlot.inicioUtc, intervaloSlot.fimUtc)
    }

    let omitirComparativo =
      intervaloSlot == null ||
      diasPeriodo > MAX_DIAS_COMPARATIVO_PERIODO_ANTERIOR ||
      atual.valorTotalPeriodoVendas <= 0

    let anteriorMeta: ExecRelatorioProdutosVendidosResult | null = null
    if (!omitirComparativo && intervaloSlot) {
      const { inicioUtc, fimUtc } = periodoRelatorioSlidingAnterior(
        intervaloSlot.inicioUtc,
        intervaloSlot.fimUtc
      )
      const paramsAnt = novoParamsIntervaloPdv(inicioUtc.toISOString(), fimUtc.toISOString())
      anteriorMeta = await executarRelatorioProdutosVendidosPipeline({
        ...pipelineOpts,
        paramsIntervaloPdV: paramsAnt,
      })
    }

    const kpis = montarKpisMvp(atual, omitirComparativo ? null : anteriorMeta)
    const participacaoGrupos = montarParticipacaoGrupos(
      atual.linhasFiltradasOrdenadas,
      atual.sumValorFiltrado
    )

    let serieTemporal: RelatorioProdutosVendidosMvpResponseDTO['serieTemporal'] = []
    let serieSimplificada = false

    if (incluirSerie && atual.detalhes.length > 0) {
      const topIds = resolverTopProdutoIdsPorValor(
        atual.linhasFiltradasOrdenadas.map(r => ({
          produtoId: r.produtoId,
          valorTotal: r.valorTotal,
        })),
        5
      )
      const nomePorId = new Map<string, string>()
      for (const [id, mini] of atual.miniMap.entries()) {
        const n = mini?.nome?.trim()
        if (n) nomePorId.set(id, n)
      }
      serieTemporal = computarSerieDiariaValorProdutosFiltrados(
        atual.detalhes,
        timezone,
        topIds,
        nomePorId
      ).serie
      if (
        serieTemporal.length === 0 &&
        atual.linhasFiltradasOrdenadas.length > 0 &&
        atual.valorTotalPeriodoVendas > 0
      ) {
        serieSimplificada = true
      }
    }

    const rankingCompleto = montarRankingEVariacoes(
      atual.linhasFiltradasOrdenadas,
      omitirComparativo || !anteriorMeta ? null : anteriorMeta.linhasFiltradasOrdenadas
    )
    const idsPagina = new Set(atual.body.items.map(i => i.produtoId))
    const rankingsPorProduto = rankingCompleto.filter(r => idsPagina.has(r.produtoId))

    const body: RelatorioProdutosVendidosMvpResponseDTO = combinarPayloadMvp({
      base: atual.body,
      kpis,
      participacaoGrupos,
      serieTemporal,
      rankings: rankingsPorProduto,
      mockFlags: {
        insightsHeuristicos: true,
        serieSimplificada,
        comparativoPeriodoAnteriorOmitido: omitirComparativo,
      },
    })

    return NextResponse.json(body)
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
