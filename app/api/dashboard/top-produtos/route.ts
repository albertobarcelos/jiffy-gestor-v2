import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

interface PeriodoDates {
  periodoInicial: string
  periodoFinal: string
}

function getPeriodoDates(periodo: string): PeriodoDates {
  const now = new Date()

  let inicio: Date | null = null
  let fim: Date | null = null

  switch (periodo) {
    case 'hoje':
      inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      inicio.setHours(0, 0, 0, 0)
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      fim.setHours(23, 59, 59, 999)
      break
    case 'semana':
      inicio = new Date(now)
      inicio.setDate(now.getDate() - 6)
      inicio.setHours(0, 0, 0, 0)
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      fim.setHours(23, 59, 59, 999)
      break
    case '30dias':
      inicio = new Date(now)
      inicio.setDate(now.getDate() - 29)
      inicio.setHours(0, 0, 0, 0)
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      fim.setHours(23, 59, 59, 999)
      break
    case 'mes':
      inicio = new Date(now.getFullYear(), now.getMonth(), 1)
      inicio.setHours(0, 0, 0, 0)
      fim = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      fim.setHours(23, 59, 59, 999)
      break
    case '60dias':
      inicio = new Date(now)
      inicio.setDate(now.getDate() - 59)
      inicio.setHours(0, 0, 0, 0)
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      fim.setHours(23, 59, 59, 999)
      break
    case '90dias':
      inicio = new Date(now)
      inicio.setDate(now.getDate() - 89)
      inicio.setHours(0, 0, 0, 0)
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      fim.setHours(23, 59, 59, 999)
      break
    default:
      return { periodoInicial: '', periodoFinal: '' }
  }

  return {
    periodoInicial: inicio ? inicio.toISOString() : '',
    periodoFinal: fim ? fim.toISOString() : '',
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || 'hoje'
  const limit = Number(searchParams.get('limit') || '10')
  const periodoInicialCustom = searchParams.get('periodoInicial')
  const periodoFinalCustom = searchParams.get('periodoFinal')

  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }
  const { tokenInfo } = validation

  const params = new URLSearchParams()

  // Se datas personalizadas foram fornecidas, usa elas
  if (periodoInicialCustom && periodoFinalCustom) {
    params.append('periodoInicial', periodoInicialCustom)
    params.append('periodoFinal', periodoFinalCustom)
  } else {
    // Caso contrário, usa a função de cálculo de período
    const { periodoInicial, periodoFinal } = getPeriodoDates(periodo)
    if (periodoInicial && periodoFinal) {
      params.append('periodoInicial', periodoInicial)
      params.append('periodoFinal', periodoFinal)
    }
  }

  params.append('status', 'FINALIZADA')
  params.append('limit', '100')

  try {
    const apiClient = new ApiClient()
    const headers = {
      Authorization: `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
    }

    const cacheKey = JSON.stringify({
      empresaId: tokenInfo.empresaId,
      periodo,
      limit,
      periodoInicial: periodoInicialCustom || '',
      periodoFinal: periodoFinalCustom || '',
    })
    const cached = globalThis.__jiffyTopProdutosCache?.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ items: cached.items })
    }

    const vendasResponse = await apiClient.request<{ items?: Array<{ id: string }> }>(
      `/api/v1/operacao-pdv/vendas?${params.toString()}`,
      { method: 'GET', headers }
    )

    const vendaIds: string[] = (vendasResponse.data?.items || []).map((venda) => venda.id)

    if (vendaIds.length === 0) {
      return NextResponse.json({ items: [] })
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
      vendaIds,
      10,
      async (vendaId) => {
        try {
          const resp = await apiClient.request<{ produtosLancados?: Array<{ produtoId: string; quantidade: number; valorFinal: number }> }>(
            `/api/v1/operacao-pdv/vendas/${vendaId}`,
            { method: 'GET', headers }
          )
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

    const items = Array.from(aggregationByProdutoId.entries())
      .map(([produtoId, agg]) => ({
        produto: produtoIdToNome.get(produtoId) ?? 'Produto Desconhecido',
        quantidade: agg.quantidade,
        valorTotal: agg.valorTotal,
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, limit)

    const ttlMs = 30_000
    globalThis.__jiffyTopProdutosCache ??= new Map()
    globalThis.__jiffyTopProdutosCache.set(cacheKey, { expiresAt: Date.now() + ttlMs, items })

    return NextResponse.json({ items })
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
