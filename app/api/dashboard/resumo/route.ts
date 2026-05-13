import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import {
  calcularPeriodoNoFusoEmpresa,
  calcularPeriodoAnteriorParaComparacaoNoFusoEmpresa,
} from '@/src/shared/utils/periodoNoFusoEmpresa'

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
    const periodo = searchParams.get('periodo') || 'hoje'
    const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'
    
    let inicioAtual: Date | null = null
    let fimAtual: Date | null = null
    let inicioAnterior: Date | null = null
    let fimAnterior: Date | null = null

    if (periodo === 'personalizado') {
      const iniStr = searchParams.get('dataFinalizacaoInicial')
      const fimStr = searchParams.get('dataFinalizacaoFinal')
      if (iniStr && fimStr) {
        inicioAtual = new Date(iniStr)
        fimAtual = new Date(fimStr)
        // Desloca 30 dias para trás para o período personalizado
        const deltaMs = 30 * 86_400_000
        inicioAnterior = new Date(inicioAtual.getTime() - deltaMs)
        fimAnterior = new Date(fimAtual.getTime() - deltaMs)
      }
    } else {
      // Mapeia o periodo do frontend para a opção do utilitário
      const mapOpcao: Record<string, string> = {
        hoje: 'Hoje',
        ontem: 'Ontem',
        semana: 'Últimos 7 Dias',
        '30dias': 'Últimos 30 Dias',
      }
      const opcao = mapOpcao[periodo] || 'Hoje'
      
      const atual = calcularPeriodoNoFusoEmpresa(opcao, timezone)
      inicioAtual = atual.inicio
      fimAtual = atual.fim
      
      const anterior = calcularPeriodoAnteriorParaComparacaoNoFusoEmpresa(opcao, timezone)
      if (anterior) {
        inicioAnterior = anterior.inicio
        fimAnterior = anterior.fim
      }
    }

    const apiClient = new ApiClient()
    const headers = {
      Authorization: `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
    }

    async function fetchMetricas(inicio: Date | null, fim: Date | null, isAtual: boolean) {
      if (!inicio || !fim) return null

      const paramsBase = new URLSearchParams()
      paramsBase.append('dataFinalizacaoInicial', inicio.toISOString())
      paramsBase.append('dataFinalizacaoFinal', fim.toISOString())

      const paramsTotal = new URLSearchParams(paramsBase.toString())
      paramsTotal.append('status', 'FINALIZADA')
      paramsTotal.append('status', 'CANCELADA')

      const paramsFinalizadas = new URLSearchParams(paramsBase.toString())
      paramsFinalizadas.append('status', 'FINALIZADA')

      const paramsCanceladas = new URLSearchParams(paramsBase.toString())
      paramsCanceladas.append('status', 'CANCELADA')

      const promises: Promise<any>[] = [
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
      ]

      if (isAtual) {
        promises.push(countMesasAbertas({ apiClient, headers }))
      }

      const results = await Promise.all(promises)
      const totalResp = results[0]
      const finalizadasResp = results[1]
      const canceladasResp = results[2]
      const mesasAbertasCount = isAtual ? results[3] : 0

      const totalMetricas = totalResp.data?.metricas ?? {}
      const finalizadasMetricas = finalizadasResp.data?.metricas ?? {}
      const canceladasMetricas = canceladasResp.data?.metricas ?? {}

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

          if (typeof countCanceladas !== 'number' && items.length < limit) {
            break
          }
        }
      } catch (err) {
        console.warn('Não foi possível calcular totalCancelado:', err)
        totalCancelado = 0
      }

      return {
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
        mesasAbertas: mesasAbertasCount ?? 0,
        totalCancelado,
      }
    }

    const [dadosAtual, dadosAnterior] = await Promise.all([
      fetchMetricas(inicioAtual, fimAtual, true),
      fetchMetricas(inicioAnterior, fimAnterior, false)
    ])

    const atual = dadosAtual || {
      total: { totalFaturado: 0, countVendasEfetivadas: 0, countVendasCanceladas: 0, countProdutosVendidos: 0 },
      finalizadas: { totalFaturado: 0, countVendasEfetivadas: 0, countVendasCanceladas: 0, countProdutosVendidos: 0 },
      canceladas: { totalFaturado: 0, countVendasEfetivadas: 0, countVendasCanceladas: 0, countProdutosVendidos: 0 },
      mesasAbertas: 0,
      totalCancelado: 0
    }

    const anterior = dadosAnterior || {
      total: { totalFaturado: 0, countVendasEfetivadas: 0, countVendasCanceladas: 0, countProdutosVendidos: 0 },
      finalizadas: { totalFaturado: 0, countVendasEfetivadas: 0, countVendasCanceladas: 0, countProdutosVendidos: 0 },
      canceladas: { totalFaturado: 0, countVendasEfetivadas: 0, countVendasCanceladas: 0, countProdutosVendidos: 0 },
      mesasAbertas: 0,
      totalCancelado: 0
    }

    function calcComparacao(valAtual: number, valAnterior: number, menorMelhor = false) {
      if (valAnterior <= 0 && valAtual <= 0) return { percentual: 0, status: 'neutro' }
      if (valAnterior <= 0 && valAtual > 0) return { percentual: 0, status: 'sem_base' }
      
      const pct = Math.round(((valAtual - valAnterior) / valAnterior) * 100)
      let status = 'neutro'
      if (pct > 0) status = menorMelhor ? 'negativo' : 'positivo'
      else if (pct < 0) status = menorMelhor ? 'positivo' : 'negativo'
      
      return { percentual: pct, status }
    }

    function calcTicketMedio(totalFaturado: number, countVendas: number) {
      return countVendas > 0 ? totalFaturado / countVendas : 0
    }

    function calcItensPorPedido(countProdutos: number, countVendas: number) {
      return countVendas > 0 ? countProdutos / countVendas : 0
    }

    const ticketAtual = calcTicketMedio(atual.total.totalFaturado, atual.total.countVendasEfetivadas)
    const ticketAnterior = calcTicketMedio(anterior.total.totalFaturado, anterior.total.countVendasEfetivadas)

    const itensAtual = calcItensPorPedido(atual.total.countProdutosVendidos, atual.total.countVendasEfetivadas)
    const itensAnterior = calcItensPorPedido(anterior.total.countProdutosVendidos, anterior.total.countVendasEfetivadas)

    return NextResponse.json({
      atual: {
        ...atual,
        ticketMedio: ticketAtual,
        itensPorPedido: itensAtual,
      },
      anterior: {
        ...anterior,
        ticketMedio: ticketAnterior,
        itensPorPedido: itensAnterior,
      },
      comparacao: {
        totalFaturado: calcComparacao(atual.total.totalFaturado, anterior.total.totalFaturado),
        countVendasEfetivadas: calcComparacao(atual.total.countVendasEfetivadas, anterior.total.countVendasEfetivadas),
        countVendasCanceladas: calcComparacao(atual.canceladas.countVendasCanceladas, anterior.canceladas.countVendasCanceladas, true),
        ticketMedio: calcComparacao(ticketAtual, ticketAnterior),
        itensPorPedido: calcComparacao(itensAtual, itensAnterior)
      }
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

