import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import {
  agregarProdutosLancadosPorProdutoId,
  buscarCardapioMiniPorProdutoIds,
  buscarDetalhesVendasComProdutosLancados,
  listarIdsVendasFinalizadasNoPeriodo,
  montarParamsVendasPdvPeriodo,
  somarValorFinalDasVendas,
} from '@/src/infrastructure/dashboard/agregarVendasPorProdutoPdv'
import { lerIntervaloFinalizacaoVendasPdv } from '@/src/shared/utils/parametrosDataFinalizacaoVendasPdv'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || 'hoje'
  const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'
  /** Card do dashboard: sempre top 10 por quantidade; totais do período vêm da agregação completa. */
  const TOP_PRODUTOS_CARD_LIMIT = 10
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }
  const { tokenInfo } = validation

  const paramsComIntervalo = montarParamsVendasPdvPeriodo({
    requestSearchParams: searchParams,
    periodo,
    timezone,
  })

  const intervaloCustom = lerIntervaloFinalizacaoVendasPdv(searchParams)

  try {
    const apiClient = new ApiClient()
    const headers = {
      Authorization: `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
    }

    const cacheKey = JSON.stringify({
      empresaId: tokenInfo.empresaId,
      periodo,
      timezone,
      intervaloCustom: intervaloCustom ?? null,
    })
    const cached = globalThis.__jiffyTopProdutosCache?.get(cacheKey)
    if (
      cached &&
      cached.expiresAt > Date.now() &&
      cached.totaisPeriodo != null &&
      typeof cached.totaisPeriodo.quantidadeTotal === 'number' &&
      typeof cached.totaisPeriodo.valorTotal === 'number'
    ) {
      return NextResponse.json({ items: cached.items, totaisPeriodo: cached.totaisPeriodo })
    }

    const vendaIdsArray = await listarIdsVendasFinalizadasNoPeriodo({
      apiClient,
      headers,
      paramsComIntervalo,
    })

    if (vendaIdsArray.length === 0) {
      const vazio = {
        items: [] as Array<{ produto: string; quantidade: number; valorTotal: number }>,
        totaisPeriodo: { quantidadeTotal: 0, valorTotal: 0 },
      }
      return NextResponse.json(vazio)
    }

    const detalhes = await buscarDetalhesVendasComProdutosLancados({
      apiClient,
      headers,
      vendaIds: vendaIdsArray,
    })

    const aggregationByProdutoId = agregarProdutosLancadosPorProdutoId(detalhes)
    const produtoIds = Array.from(aggregationByProdutoId.keys())

    const miniMap = await buscarCardapioMiniPorProdutoIds({
      apiClient,
      headers,
      produtoIds,
    })

    const todasOrdenadas = Array.from(aggregationByProdutoId.entries())
      .map(([produtoId, agg]) => ({
        produto: miniMap.get(produtoId)?.nome ?? 'Produto Desconhecido',
        quantidade: agg.quantidade,
        valorTotal: agg.valorTotal,
      }))
      .sort((a, b) => b.quantidade - a.quantidade)

    let quantidadeTotalPeriodo = 0
    for (const row of todasOrdenadas) {
      quantidadeTotalPeriodo += row.quantidade
    }
    const valorTotalPeriodo = somarValorFinalDasVendas(detalhes)

    const items = todasOrdenadas.slice(0, TOP_PRODUTOS_CARD_LIMIT)
    const totaisPeriodo = { quantidadeTotal: quantidadeTotalPeriodo, valorTotal: valorTotalPeriodo }

    const ttlMs = 30_000
    globalThis.__jiffyTopProdutosCache ??= new Map()
    globalThis.__jiffyTopProdutosCache.set(cacheKey, { expiresAt: Date.now() + ttlMs, items, totaisPeriodo })

    return NextResponse.json({ items, totaisPeriodo })
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
