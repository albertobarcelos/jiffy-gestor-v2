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

/** Identifica o usuário PDV responsável pela venda no detalhe retornado pela API. */
function userIdFromVendaDetail(d: Record<string, unknown>): string {
  const abertoPor = d.abertoPor as Record<string, unknown> | undefined
  const usuarioPdv = d.usuarioPdv as Record<string, unknown> | undefined
  return (
    (typeof d.abertoPorId === 'string' ? d.abertoPorId : '') ||
    (typeof abertoPor?.id === 'string' ? (abertoPor.id as string) : '') ||
    (typeof usuarioPdv?.id === 'string' ? (usuarioPdv.id as string) : '') ||
    ''
  )
}

function somaQuantidadeProdutos(produtos: Array<{ quantidade?: number }> | undefined): number {
  if (!Array.isArray(produtos)) return 0
  let s = 0
  for (const p of produtos) {
    s += typeof p.quantidade === 'number' ? p.quantidade : 0
  }
  return s
}

type VendaDetalhe = Record<string, unknown> & {
  produtosLancados?: Array<{ quantidade?: number }>
  valorFinal?: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || 'hoje'
  /** Resumo: 10 linhas; “ver todos”: até 500 (mesma ideia do top produtos). */
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || '10'), 1), 500)
  const periodoInicialCustom = searchParams.get('periodoInicial')
  const periodoFinalCustom = searchParams.get('periodoFinal')

  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }
  const { tokenInfo } = validation

  const params = new URLSearchParams()

  if (periodoInicialCustom && periodoFinalCustom) {
    params.append('periodoInicial', periodoInicialCustom)
    params.append('periodoFinal', periodoFinalCustom)
  } else {
    const { periodoInicial, periodoFinal } = getPeriodoDates(periodo)
    if (periodoInicial && periodoFinal) {
      params.append('periodoInicial', periodoInicial)
      params.append('periodoFinal', periodoFinal)
    }
  }

  params.append('status', 'FINALIZADA')
  // Mesmo limite do top-produtos: amostra de vendas no período (pode não cobrir 100% se houver mais de 100 vendas).
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
    const cached = globalThis.__jiffyTopGarconsCache?.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        items: cached.items,
        totalUsuariosComVendas: cached.totalUsuariosComVendas,
      })
    }

    const vendasResponse = await apiClient.request<{ items?: Array<{ id: string }> }>(
      `/api/v1/operacao-pdv/vendas?${params.toString()}`,
      { method: 'GET', headers }
    )

    const vendaIds: string[] = (vendasResponse.data?.items || []).map(venda => venda.id)

    if (vendaIds.length === 0) {
      return NextResponse.json({ items: [], totalUsuariosComVendas: 0 })
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

    const detalhes = await fetchWithConcurrency(vendaIds, 10, async vendaId => {
      try {
        const resp = await apiClient.request<VendaDetalhe>(
          `/api/v1/operacao-pdv/vendas/${vendaId}`,
          {
            method: 'GET',
            headers,
          }
        )
        return resp.data
      } catch {
        return null
      }
    })

    const porUsuario = new Map<
      string,
      { qtdProdutos: number; qtdVendas: number; valorTotal: number }
    >()

    for (const venda of detalhes) {
      if (!venda) continue
      const uid = userIdFromVendaDetail(venda as Record<string, unknown>)
      if (!uid) continue

      const qProd = somaQuantidadeProdutos(venda.produtosLancados)
      const valor =
        typeof venda.valorFinal === 'number' && !Number.isNaN(venda.valorFinal)
          ? venda.valorFinal
          : 0

      const agg = porUsuario.get(uid) ?? { qtdProdutos: 0, qtdVendas: 0, valorTotal: 0 }
      agg.qtdProdutos += qProd
      agg.qtdVendas += 1
      agg.valorTotal += valor
      porUsuario.set(uid, agg)
    }

    const ordenadosFull = Array.from(porUsuario.entries())
      .map(([usuarioId, agg]) => ({ usuarioId, ...agg }))
      .sort((a, b) => {
        if (b.valorTotal !== a.valorTotal) return b.valorTotal - a.valorTotal
        if (b.qtdVendas !== a.qtdVendas) return b.qtdVendas - a.qtdVendas
        return b.qtdProdutos - a.qtdProdutos
      })

    // Distintos com pelo menos uma venda finalizada na amostra (qtdVendas ≥ 1 por usuário).
    const totalUsuariosComVendas = ordenadosFull.length

    const ordenados = ordenadosFull.slice(0, limit)

    const itemsComNome = await fetchWithConcurrency(ordenados, 8, async row => {
      let nome = ''
      try {
        const userResp = await apiClient.request<{ nome?: string }>(
          `/api/v1/pessoas/usuarios-pdv/${row.usuarioId}`,
          { method: 'GET', headers }
        )
        nome = typeof userResp.data?.nome === 'string' ? userResp.data.nome : ''
      } catch {
        nome = ''
      }
      return {
        usuarioId: row.usuarioId,
        nome: nome || 'Usuário PDV',
        qtdProdutos: row.qtdProdutos,
        qtdVendas: row.qtdVendas,
        valorTotal: row.valorTotal,
      }
    })

    const ttlMs = 30_000
    globalThis.__jiffyTopGarconsCache ??= new Map()
    globalThis.__jiffyTopGarconsCache.set(cacheKey, {
      expiresAt: Date.now() + ttlMs,
      items: itemsComNome,
      totalUsuariosComVendas,
    })

    return NextResponse.json({ items: itemsComNome, totalUsuariosComVendas })
  } catch (error) {
    console.error('Erro ao buscar top garçons:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar top garçons.' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno ao buscar top garçons.' }, { status: 500 })
  }
}
