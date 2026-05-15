import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import {
  appendIntervaloFinalizacaoVendasPdv,
  lerIntervaloFinalizacaoVendasPdv,
} from '@/src/shared/utils/parametrosDataFinalizacaoVendasPdv'
import { calcularPeriodoNoFusoEmpresa } from '@/src/shared/utils/periodoNoFusoEmpresa'

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

type VendaDetalhe = Record<string, unknown> & {
  produtosLancados?: Array<{ quantidade?: number; removido?: boolean }>
  valorFinal?: number
}

type VendasListPage = {
  items?: Array<{ id?: string }>
}

/**
 * Coleta IDs de vendas FINALIZADAS paginando de 100 em 100 até o último lote incompleto.
 * Limita quantos IDs seguem para busca de detalhe (N× GET por venda) para não estourar o timeout da rota Next.
 * Acima desse teto o ranking/totais são amostra — agregação 100% exigiria endpoint agregado no PDV.
 */
async function fetchTodosIdsVendasFinalizadas(args: {
  apiClient: ApiClient
  headers: Record<string, string>
  /** Já com status, período etc.; não deve conter limit/offset. */
  baseParams: URLSearchParams
}): Promise<string[]> {
  const PAGE = 100
  /** Evita loop enorme se a API ignorar offset ou responder sempre página cheia. */
  const MAX_PAGES_LISTA = 200
  /** Cada ID vira um GET `/vendas/:id` — limite defensivo para o BFF não dar 504 / abort. */
  const MAX_IDS_PARA_DETALHAR = 10000
  const ids: string[] = []

  paginas: for (let pageIndex = 0; pageIndex < MAX_PAGES_LISTA; pageIndex++) {
    const p = new URLSearchParams(args.baseParams.toString())
    p.set('limit', String(PAGE))
    p.set('offset', String(pageIndex * PAGE))

    const resp = await args.apiClient.request<VendasListPage>(
      `/api/v1/operacao-pdv/vendas?${p.toString()}`,
      { method: 'GET', headers: args.headers }
    )

    const page = resp.data ?? {}
    const items = Array.isArray(page.items) ? page.items : []

    for (const v of items) {
      const id = typeof v?.id === 'string' ? v.id : ''
      if (!id) continue
      ids.push(id)
      if (ids.length >= MAX_IDS_PARA_DETALHAR) break paginas
    }

    if (items.length === 0 || items.length < PAGE) break
  }

  return ids
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || 'hoje'
  const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'
  /** Resumo: 10 linhas; “ver todos”: até 500 (mesma ideia do top produtos). */
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || '10'), 1), 500)
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
      limit,
      intervaloCustom: intervaloCustom ?? null,
    })
    const cached = globalThis.__jiffyTopGarconsCache?.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        items: cached.items,
        totalUsuariosComVendas: cached.totalUsuariosComVendas,
      })
    }

    const vendaIds = await fetchTodosIdsVendasFinalizadas({
      apiClient,
      headers,
      baseParams: params,
    })

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
