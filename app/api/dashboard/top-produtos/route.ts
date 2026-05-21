import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import {
  agregarProdutosLancadosPorProdutoId,
  buscarCardapioMiniPorProdutoIds,
  somarValorFinalDasVendas,
} from '@/src/infrastructure/dashboard/agregarVendasPorProdutoPdv'
import {
  buildDashboardVendasPeriodoCacheKey,
  obterDetalhesVendasFinalizadasPeriodo,
} from '@/src/infrastructure/dashboard/dashboardVendasPeriodoCache'
import { montarParamsDashboardVendasPeriodo } from '@/src/infrastructure/dashboard/montarParamsDashboardPeriodo'

const TOP_PRODUTOS_CARD_LIMIT = 10

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || 'hoje'
  const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'

  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }
  const { tokenInfo } = validation

  const params = montarParamsDashboardVendasPeriodo({
    requestSearchParams: searchParams,
    periodo,
    timezone,
    status: 'FINALIZADA',
  })

  try {
    const apiClient = new ApiClient()
    const headers = {
      Authorization: `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
    }

    const cacheKey = buildDashboardVendasPeriodoCacheKey({
      empresaId: tokenInfo.empresaId ?? '',
      paramsComIntervalo: params,
    })

    const detalhes = await obterDetalhesVendasFinalizadasPeriodo({
      apiClient,
      headers,
      paramsComIntervalo: params,
      cacheKey,
    })

    if (detalhes.length === 0) {
      return NextResponse.json({
        items: [] as Array<{ produto: string; quantidade: number; valorTotal: number }>,
        totaisPeriodo: { quantidadeTotal: 0, valorTotal: 0 },
      })
    }

    const aggregationByProdutoId = agregarProdutosLancadosPorProdutoId(detalhes)
    const produtoIds = Array.from(aggregationByProdutoId.keys())

    const miniMap = await buscarCardapioMiniPorProdutoIds({
      apiClient,
      headers,
      produtoIds,
      concurrency: 20,
    })

    const todasOrdenadas = Array.from(aggregationByProdutoId.entries())
      .map(([produtoId, agg]) => ({
        produto: miniMap.get(produtoId)?.nome ?? 'Produto Desconhecido',
        quantidade: agg.quantidade,
        valorTotal: agg.valorTotal,
      }))
      .sort((a, b) => b.quantidade - a.quantidade)

    const valorTotalPeriodoVendas = somarValorFinalDasVendas(detalhes)
    let quantidadeTotalPeriodo = 0
    for (const row of todasOrdenadas) {
      quantidadeTotalPeriodo += row.quantidade
    }

    const items = todasOrdenadas.slice(0, TOP_PRODUTOS_CARD_LIMIT)

    return NextResponse.json(
      {
        items,
        totaisPeriodo: {
          quantidadeTotal: quantidadeTotalPeriodo,
          valorTotal: valorTotalPeriodoVendas,
        },
      },
      { headers: { 'Cache-Control': 'private, max-age=30' } }
    )
  } catch (error) {
    console.error('Erro ao buscar top produtos:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar top produtos.' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno ao buscar top produtos.' }, { status: 500 })
  }
}
