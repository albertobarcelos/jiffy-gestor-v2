import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import {
  buildDashboardVendasPeriodoCacheKey,
  obterDetalhesVendasFinalizadasPeriodo,
  type VendaDetalheDashboard,
} from '@/src/infrastructure/dashboard/dashboardVendasPeriodoCache'
import { montarParamsDashboardVendasPeriodo } from '@/src/infrastructure/dashboard/montarParamsDashboardPeriodo'

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

function somaQuantidadeProdutos(
  produtos: Array<{ quantidade?: number; removido?: boolean }> | undefined
): number {
  if (!Array.isArray(produtos)) return 0
  let s = 0
  for (const p of produtos) {
    if (p?.removido === true) continue
    s += typeof p.quantidade === 'number' ? p.quantidade : 0
  }
  return s
}

async function fetchWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  handler: (item: T) => Promise<R>
): Promise<R[]> {
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || 'hoje'
  const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || '10'), 1), 500)

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
      return NextResponse.json({ items: [], totalUsuariosComVendas: 0 })
    }

    const porUsuario = new Map<
      string,
      { qtdProdutos: number; qtdVendas: number; valorTotal: number }
    >()

    for (const venda of detalhes) {
      if (!venda) continue
      const v = venda as VendaDetalheDashboard
      const uid = userIdFromVendaDetail(v)
      if (!uid) continue

      const produtos = v.produtosLancados as Array<{ quantidade?: number; removido?: boolean }> | undefined
      const qProd = somaQuantidadeProdutos(produtos)
      const valorRaw = v.valorFinal
      const valor =
        typeof valorRaw === 'number' && !Number.isNaN(valorRaw)
          ? valorRaw
          : typeof valorRaw === 'string'
            ? parseFloat(valorRaw) || 0
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

    const totalUsuariosComVendas = ordenadosFull.length
    const ordenados = ordenadosFull.slice(0, limit)

    const itemsComNome = await fetchWithConcurrency(ordenados, 12, async row => {
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

    return NextResponse.json(
      { items: itemsComNome, totalUsuariosComVendas },
      { headers: { 'Cache-Control': 'private, max-age=30' } }
    )
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
