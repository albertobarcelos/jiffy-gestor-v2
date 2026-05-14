import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import {
  appendIntervaloFinalizacaoVendasPdv,
  lerIntervaloFinalizacaoVendasPdv,
} from '@/src/shared/utils/parametrosDataFinalizacaoVendasPdv'
import { calcularPeriodoNoFusoEmpresa } from '@/src/shared/utils/periodoNoFusoEmpresa'

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

  const params = new URLSearchParams()

  const intervaloCustom = lerIntervaloFinalizacaoVendasPdv(searchParams)
  if (intervaloCustom) {
    appendIntervaloFinalizacaoVendasPdv(params, intervaloCustom)
  } else {
    // Mapeia o periodo do frontend para a opção do utilitário
    const mapOpcao: Record<string, string> = {
      hoje: 'Hoje',
      ontem: 'Ontem',
      semana: 'Últimos 7 Dias',
      '30dias': 'Últimos 30 Dias',
      mes: 'Mês Atual',
      '60dias': 'Últimos 60 Dias',
      '90dias': 'Últimos 90 Dias',
    }
    const opcao = mapOpcao[periodo] || 'Hoje'
    const { inicio, fim } = calcularPeriodoNoFusoEmpresa(opcao, timezone)
    
    if (inicio && fim) {
      appendIntervaloFinalizacaoVendasPdv(params, { inicial: inicio.toISOString(), final: fim.toISOString() })
    }
  }

  params.append('status', 'FINALIZADA')

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

    // Paginação 100 em 100 até esgotar vendas do período (totais de produto dependem de todas as vendas).
    const limitPerPage = 100
    const vendaIds = new Set<string>()
    let page = 0
    let totalPages = 1

    while (page < totalPages) {
      const pageParams = new URLSearchParams(params.toString())
      pageParams.append('limit', limitPerPage.toString())
      pageParams.append('offset', (page * limitPerPage).toString())

      const vendasResponse = await apiClient.request<{
        items?: Array<{ id: string }>
        count?: number
        total?: number
        totalCount?: number
      }>(`/api/v1/operacao-pdv/vendas?${pageParams.toString()}`, { method: 'GET', headers })

      const items = vendasResponse.data?.items || []
      items.forEach((v) => {
        if (v.id) vendaIds.add(v.id)
      })

      if (page === 0) {
        const data = vendasResponse.data || {}
        const totalCount =
          (typeof data.count === 'number' && Number.isFinite(data.count) ? data.count : null) ??
          (typeof data.total === 'number' && Number.isFinite(data.total) ? data.total : null) ??
          (typeof data.totalCount === 'number' && Number.isFinite(data.totalCount) ? data.totalCount : null)

        if (typeof totalCount === 'number' && totalCount > 0) {
          totalPages = Math.ceil(totalCount / limitPerPage)
        } else if (items.length < limitPerPage) {
          totalPages = 1
        } else {
          totalPages = 200 // Fallback seguro
        }
      }

      if (items.length < limitPerPage) {
        break
      }

      page++
    }

    const vendaIdsArray = Array.from(vendaIds)

    if (vendaIdsArray.length === 0) {
      const vazio = { items: [] as Array<{ produto: string; quantidade: number; valorTotal: number }>, totaisPeriodo: { quantidadeTotal: 0, valorTotal: 0 } }
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

    const produtoIdToNome = new Map<string, string>()
    produtoIds.forEach((id, i) => produtoIdToNome.set(id, nomes[i]))

    const todasOrdenadas = Array.from(aggregationByProdutoId.entries())
      .map(([produtoId, agg]) => ({
        produto: produtoIdToNome.get(produtoId) ?? 'Produto Desconhecido',
        quantidade: agg.quantidade,
        valorTotal: agg.valorTotal,
      }))
      .sort((a, b) => b.quantidade - a.quantidade)

    let quantidadeTotalPeriodo = 0
    let valorTotalPeriodo = 0
    for (const row of todasOrdenadas) {
      quantidadeTotalPeriodo += row.quantidade
      valorTotalPeriodo += row.valorTotal
    }

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
