import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import {
  appendIntervaloFinalizacaoVendasPdv,
  lerIntervaloFinalizacaoVendasPdv,
} from '@/src/shared/utils/parametrosDataFinalizacaoVendasPdv'

type VendasMetricas = {
  totalFaturado?: number
  countVendasEfetivadas?: number
  countVendasCanceladas?: number
  countProdutosVendidos?: number
}

type VendasResponse = {
  metricas?: VendasMetricas
  items?: unknown[]
  count?: number
  total?: number
  totalCount?: number
}

function sumCanceladas(items: unknown[]): number {
  return items.reduce<number>((acc, raw) => {
    if (!raw || typeof raw !== 'object') return acc
    const venda = raw as Record<string, unknown>
    const valor =
      (typeof venda.valorFinal === 'number' && Number.isFinite(venda.valorFinal) ? venda.valorFinal : null) ??
      (typeof venda.valorTotal === 'number' && Number.isFinite(venda.valorTotal) ? venda.valorTotal : null) ??
      (typeof venda.valor === 'number' && Number.isFinite(venda.valor) ? venda.valor : null) ??
      0
    return acc + valor
  }, 0)
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function resolveCountFromResponse(data: VendasResponse): number | null {
  const candidates = [data.count, data.total, data.totalCount].map(asNumber).filter((n): n is number => n !== null)
  if (candidates.length > 0) return candidates[0]
  if (Array.isArray(data.items)) return data.items.length
  return null
}

async function countMesasAbertas(args: {
  apiClient: ApiClient
  headers: Record<string, string>
}): Promise<number> {
  const { apiClient, headers } = args
  const limit = 100
  const ids = new Set<string>()

  // Primeira página para descobrir paginação
  const firstParams = new URLSearchParams({
    status: 'ABERTA',
    tipoVenda: 'mesa',
    limit: String(limit),
    offset: '0',
  })

  const firstResp = await apiClient.request<VendasResponse>(`/api/v1/operacao-pdv/vendas?${firstParams.toString()}`, {
    method: 'GET',
    headers,
  })
  const firstItems = Array.isArray(firstResp.data?.items) ? firstResp.data.items : []
  firstItems.forEach((raw) => {
    if (raw && typeof raw === 'object' && 'id' in (raw as any)) {
      const id = (raw as any).id
      if (typeof id === 'string' && id) ids.add(id)
    }
  })

  const totalCount = resolveCountFromResponse(firstResp.data ?? {})
  const totalPages =
    typeof totalCount === 'number' && totalCount >= 0 ? Math.ceil(totalCount / limit) : null

  // Se o backend não informar total, fazemos paginação até esgotar.
  const safeTotalPages = totalPages ? Math.max(1, Math.min(totalPages, 200)) : 200

  for (let page = 1; page < safeTotalPages; page++) {
    // Se não temos totalCount confiável, paramos quando a página vier menor que limit.
    if (!totalPages && firstItems.length < limit) break

    const params = new URLSearchParams({
      status: 'ABERTA',
      tipoVenda: 'mesa',
      limit: String(limit),
      offset: String(page * limit),
    })
    const resp = await apiClient.request<VendasResponse>(`/api/v1/operacao-pdv/vendas?${params.toString()}`, {
      method: 'GET',
      headers,
    })
    const items = Array.isArray(resp.data?.items) ? resp.data.items : []
    items.forEach((raw) => {
      if (raw && typeof raw === 'object' && 'id' in (raw as any)) {
        const id = (raw as any).id
        if (typeof id === 'string' && id) ids.add(id)
      }
    })
    if (!totalPages && items.length < limit) break
  }

  return ids.size
}

/**
 * GET /api/dashboard/resumo
 *
 * Agrega métricas do dashboard para reduzir round-trips na montagem da página.
 * Não altera backend externo; apenas consolida chamadas no BFF.
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const paramsBase = new URLSearchParams()
    const intervalo = lerIntervaloFinalizacaoVendasPdv(searchParams)
    if (intervalo) {
      appendIntervaloFinalizacaoVendasPdv(paramsBase, intervalo)
    }

    const apiClient = new ApiClient()
    const headers = {
      Authorization: `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
    }

    const paramsTotal = new URLSearchParams(paramsBase.toString())
    paramsTotal.append('status', 'FINALIZADA')
    paramsTotal.append('status', 'CANCELADA')

    const paramsFinalizadas = new URLSearchParams(paramsBase.toString())
    paramsFinalizadas.append('status', 'FINALIZADA')

    const paramsCanceladas = new URLSearchParams(paramsBase.toString())
    paramsCanceladas.append('status', 'CANCELADA')

    const [totalResp, finalizadasResp, canceladasResp, mesasAbertasCount] = await Promise.all([
      apiClient.request<VendasResponse>(`/api/v1/operacao-pdv/vendas?${paramsTotal.toString()}`, {
        method: 'GET',
        headers,
      }),
      apiClient.request<VendasResponse>(`/api/v1/operacao-pdv/vendas?${paramsFinalizadas.toString()}`, {
        method: 'GET',
        headers,
      }),
      apiClient.request<VendasResponse>(`/api/v1/operacao-pdv/vendas?${paramsCanceladas.toString()}`, {
        method: 'GET',
        headers,
      }),
      countMesasAbertas({ apiClient, headers }),
    ])

    const totalMetricas = totalResp.data?.metricas ?? {}
    const finalizadasMetricas = finalizadasResp.data?.metricas ?? {}
    const canceladasMetricas = canceladasResp.data?.metricas ?? {}

    // Total cancelado não vem pronto em `metricas`, então calculamos somando os itens CANCELADA.
    // Faz paginação no BFF para evitar custo no cliente.
    let totalCancelado = 0
    try {
      const countCanceladas = resolveCountFromResponse(canceladasResp.data ?? {})
      const limit = 100
      const totalPages =
        typeof countCanceladas === 'number' && countCanceladas >= 0
          ? Math.ceil(countCanceladas / limit)
          : 1
      const safeTotalPages = Math.max(1, Math.min(totalPages, 200))

      for (let page = 0; page < safeTotalPages; page++) {
        const paramsPage = new URLSearchParams(paramsBase.toString())
        paramsPage.append('status', 'CANCELADA')
        paramsPage.append('limit', limit.toString())
        paramsPage.append('offset', String(page * limit))

        const resp = await apiClient.request<VendasResponse>(`/api/v1/operacao-pdv/vendas?${paramsPage.toString()}`, {
          method: 'GET',
          headers,
        })

        const items = Array.isArray(resp.data?.items) ? resp.data.items : []
        totalCancelado += sumCanceladas(items)

        // Se não temos contagem confiável, paramos quando vier menos que o limit.
        if (typeof countCanceladas !== 'number' && items.length < limit) {
          break
        }
      }
    } catch (err) {
      console.warn('Não foi possível calcular totalCancelado:', err)
      totalCancelado = 0
    }

    return NextResponse.json({
      metricas: {
        total: {
          totalFaturado: totalMetricas.totalFaturado ?? 0,
          countVendasEfetivadas: totalMetricas.countVendasEfetivadas ?? 0,
          countVendasCanceladas: totalMetricas.countVendasCanceladas ?? 0,
          countProdutosVendidos: totalMetricas.countProdutosVendidos ?? 0,
        },
        finalizadas: {
          totalFaturado: finalizadasMetricas.totalFaturado ?? 0,
          countVendasEfetivadas: finalizadasMetricas.countVendasEfetivadas ?? 0,
          countVendasCanceladas: finalizadasMetricas.countVendasCanceladas ?? 0,
          countProdutosVendidos: finalizadasMetricas.countProdutosVendidos ?? 0,
        },
        canceladas: {
          totalFaturado: canceladasMetricas.totalFaturado ?? 0,
          countVendasEfetivadas: canceladasMetricas.countVendasEfetivadas ?? 0,
          countVendasCanceladas: canceladasMetricas.countVendasCanceladas ?? 0,
          countProdutosVendidos: canceladasMetricas.countProdutosVendidos ?? 0,
        },
      },
      mesasAbertas: mesasAbertasCount ?? 0,
      totalCancelado,
    })
  } catch (error) {
    console.error('Erro ao buscar resumo do dashboard:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar resumo do dashboard' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

