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
} from '@/src/infrastructure/relatorios/montarRelatorioProdutosVendidos'

/**
 * GET /api/relatorios/produtos-vendidos
 *
 * Agrega vendas PDV finalizadas (mesma base que /api/dashboard/top-produtos) com filtros,
 * ordenação, paginação e curva ABC (80/15/5 por valor no conjunto filtrado).
 *
 * Query params:
 * - periodo, timezone, dataFinalizacaoInicial, dataFinalizacaoFinal (igual dashboard)
 * - sort: quantidade_desc | quantidade_asc | valor_desc | valor_asc
 * - grupoIds: ids separados por vírgula
 * - valorMin, valorMax, qtdMin, qtdMax (números)
 * - q: busca por nome (substring case-insensitive)
 * - limit (default 50, max 200), offset (default 0)
 * - mock=1 preenche margemBrutaPercentual fictícia (até existir CMV no backend).
 *
 * Campos ainda dependentes de backend futuro: margemBrutaPercentual (null sem mock);
 * séries temporais / comparativo de períodos não fazem parte desta resposta.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || 'hoje'
  const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'
  const sort = parseSortRelatorio(searchParams.get('sort') || 'quantidade_desc')

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

    const result = await executarRelatorioProdutosVendidosPipeline({
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
    })

    return NextResponse.json(result.body)
  } catch (error) {
    console.error('Erro em /api/relatorios/produtos-vendidos:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao montar relatório de produtos vendidos.' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno ao montar relatório de produtos vendidos.' }, { status: 500 })
  }
}
