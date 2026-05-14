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

    const fetchWithConcurrency = async <T, R>(
      items: T[],
      concurrency: number,
      handler: (item: T) => Promise<R>
    ): Promise<R[]> => {
      const results: R[] = new Array(items.length)
      let idx = 0

      const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
        while (idx < items.length) {
          const current = idx++
          results[current] = await handler(items[current])
        }
      })

      await Promise.all(workers)
      return results
    }

    const detalhes = await fetchWithConcurrency(
      vendaIdsArray,
      10,
      async (vendaId) => {
        try {
          const resp = await apiClient.request<{
            valorFinal?: number
            produtosLancados?: Array<{
              produtoId: string
              quantidade: number
              valorFinal: number
              removido?: boolean
            }>
          }>(`/api/v1/operacao-pdv/vendas/${vendaId}`, { method: 'GET', headers })
          return resp.data
        } catch {
          return null
        }
      }
    )

    const aggregationByProdutoId = new Map<string, { quantidade: number; valorTotal: number }>()

    for (const venda of detalhes) {
      if (!venda?.produtosLancados) continue
      for (const p of venda.produtosLancados) {
        if (!p?.produtoId) continue
        /* Itens cancelados/removidos da comanda não contam como venda efetiva. */
        if (p.removido === true) continue
        const existing = aggregationByProdutoId.get(p.produtoId)
        const quantidade = typeof p.quantidade === 'number' ? p.quantidade : 0
        const valorTotal = typeof p.valorFinal === 'number' ? p.valorFinal : 0
        if (existing) {
          existing.quantidade += quantidade
          existing.valorTotal += valorTotal
        } else {
          aggregationByProdutoId.set(p.produtoId, { quantidade, valorTotal })
        }
      }
    }

    const produtoIds = Array.from(aggregationByProdutoId.keys())
    const nomesCache: Map<string, string> =
      globalThis.__jiffyProdutoNomeCache ?? (globalThis.__jiffyProdutoNomeCache = new Map())

    const nomes = await fetchWithConcurrency(produtoIds, 10, async (produtoId) => {
      const cachedName = nomesCache.get(produtoId)
      if (cachedName) return cachedName
      try {
        const resp = await apiClient.request<{ nome?: string }>(`/api/v1/cardapio/produtos/${produtoId}`, {
          method: 'GET',
          headers,
        })
        const nome = resp.data?.nome ?? 'Produto Desconhecido'
        nomesCache.set(produtoId, nome)
        return nome
      } catch {
        const nome = 'Produto Desconhecido'
        nomesCache.set(produtoId, nome)
        return nome
      }
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

    /**
     * Faturamento do período deve bater com Top Garçons e demais visões: soma do `valorFinal`
     * de cada venda (total da comanda). A soma dos `valorFinal` das linhas em `produtosLancados`
     * costuma ser menor (taxa de serviço, taxa de entrega, desconto global, etc. não repartidos
     * por item na API).
     */
    let valorTotalPeriodoVendas = 0
    for (const venda of detalhes) {
      if (!venda) continue
      const vf = venda.valorFinal
      if (typeof vf === 'number' && Number.isFinite(vf)) {
        valorTotalPeriodoVendas += vf
      }
    }

    let quantidadeTotalPeriodo = 0
    for (const row of todasOrdenadas) {
      quantidadeTotalPeriodo += row.quantidade
    }
    const valorTotalPeriodo = somarValorFinalDasVendas(detalhes)

    const items = todasOrdenadas.slice(0, TOP_PRODUTOS_CARD_LIMIT)
    const totaisPeriodo = {
      quantidadeTotal: quantidadeTotalPeriodo,
      valorTotal: valorTotalPeriodoVendas,
    }

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
