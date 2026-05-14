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
import type {
  RelatorioProdutoVendidoClasseAbc,
  RelatorioProdutoVendidoLinhaDTO,
  RelatorioProdutosVendidosResponseDTO,
  RelatorioProdutosVendidosSort,
} from '@/src/shared/types/relatoriosProdutosVendidosApi'

/**
 * GET /api/relatorios/produtos-vendidos
 *
 * Agrega vendas PDV finalizadas (mesma base que /api/dashboard/top-produtos) com filtros,
 * ordenação, paginação e curva ABC (80/15/5 por valor no conjunto filtrado).
 *
 * Query params:
 * - periodo, timezone, dataFinalizacaoInicial, dataFinalizacaoFinal (igual dashboard)
 * - sort: quantidade_desc | quantidade_asc | valor_desc | valor_asc
 * - grupoIds: ids separados por vírgula
 * - valorMin, valorMax, qtdMin, qtdMax (números)
 * - q: busca por nome (substring case-insensitive)
 * - limit (default 50, max 200), offset (default 0)
 * - mock=1 preenche margemBrutaPercentual fictícia (até existir CMV no backend).
 *
 * Campos ainda dependentes de backend futuro: margemBrutaPercentual (null sem mock);
 * séries temporais / comparativo de períodos não fazem parte desta resposta.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || 'hoje'
  const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'
  const sortRaw = (searchParams.get('sort') || 'quantidade_desc').trim()
  const sort: RelatorioProdutosVendidosSort = isSort(sortRaw) ? sortRaw : 'quantidade_desc'

  const grupoIdsParam = searchParams.get('grupoIds')?.trim()
  const grupoIdSet =
    grupoIdsParam && grupoIdsParam.length > 0
      ? new Set(
          grupoIdsParam
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        )
      : null

  const valorMin = parseOptionalNumber(searchParams.get('valorMin'))
  const valorMax = parseOptionalNumber(searchParams.get('valorMax'))
  const qtdMin = parseOptionalNumber(searchParams.get('qtdMin'))
  const qtdMax = parseOptionalNumber(searchParams.get('qtdMax'))
  const qBusca = normalizeBusca(searchParams.get('q'))

  const limit = clampInt(searchParams.get('limit'), 50, 1, 200)
  const offset = clampInt(searchParams.get('offset'), 0, 0, 50_000)

  const mockAtivo = searchParams.get('mock') === '1'

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

  try {
    const apiClient = new ApiClient()
    const headers = {
      Authorization: `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
    }

    const vendaIdsArray = await listarIdsVendasFinalizadasNoPeriodo({
      apiClient,
      headers,
      paramsComIntervalo,
    })

    if (vendaIdsArray.length === 0) {
      const body: RelatorioProdutosVendidosResponseDTO = {
        items: [],
        totaisPeriodo: { quantidadeTotal: 0, valorTotal: 0, skusDistintos: 0 },
        totalFiltrado: 0,
        limit,
        offset,
        mockAtivo,
      }
      return NextResponse.json(body)
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

    type Linha = {
      produtoId: string
      nome: string
      grupoId: string | null
      grupoNome: string | null
      quantidade: number
      valorTotal: number
    }

    const linhas: Linha[] = Array.from(aggregationByProdutoId.entries()).map(([produtoId, agg]) => {
      const mini = miniMap.get(produtoId)
      return {
        produtoId,
        nome: mini?.nome ?? 'Produto Desconhecido',
        grupoId: mini?.grupoId ?? null,
        grupoNome: mini?.nomeGrupo ?? null,
        quantidade: agg.quantidade,
        valorTotal: agg.valorTotal,
      }
    })

    let quantidadeTotalPeriodo = 0
    for (const row of linhas) {
      quantidadeTotalPeriodo += row.quantidade
    }
    const valorTotalPeriodoVendas = somarValorFinalDasVendas(detalhes)
    const skusDistintos = linhas.length

    let filtradas = linhas

    if (grupoIdSet && grupoIdSet.size > 0) {
      filtradas = filtradas.filter(r => r.grupoId && grupoIdSet.has(r.grupoId))
    }

    if (valorMin != null) {
      filtradas = filtradas.filter(r => r.valorTotal >= valorMin)
    }
    if (valorMax != null) {
      filtradas = filtradas.filter(r => r.valorTotal <= valorMax)
    }
    if (qtdMin != null) {
      filtradas = filtradas.filter(r => r.quantidade >= qtdMin)
    }
    if (qtdMax != null) {
      filtradas = filtradas.filter(r => r.quantidade <= qtdMax)
    }

    if (qBusca) {
      filtradas = filtradas.filter(r => r.nome.toLowerCase().includes(qBusca))
    }

    const sumValorFiltrado = filtradas.reduce((s, r) => s + r.valorTotal, 0)
    const sumQtdFiltrado = filtradas.reduce((s, r) => s + r.quantidade, 0)

    filtradas = [...filtradas].sort((a, b) => compareLinhas(a, b, sort))

    const porValorDesc = [...filtradas].sort((a, b) => b.valorTotal - a.valorTotal)
    const abcById = new Map<string, RelatorioProdutoVendidoClasseAbc>()
    let cum = 0
    for (const r of porValorDesc) {
      const prevPct = sumValorFiltrado > 0 ? (cum / sumValorFiltrado) * 100 : 100
      cum += r.valorTotal
      let classe: RelatorioProdutoVendidoClasseAbc = 'C'
      if (prevPct < 80) classe = 'A'
      else if (prevPct < 95) classe = 'B'
      abcById.set(r.produtoId, classe)
    }

    const totalFiltrado = filtradas.length
    const slice = filtradas.slice(offset, offset + limit)

    const items: RelatorioProdutoVendidoLinhaDTO[] = slice.map(r => {
      const precoMedioVenda = r.quantidade > 0 ? r.valorTotal / r.quantidade : 0
      const valorCardapio = miniMap.get(r.produtoId)?.valorCardapio
      const valorCardapioNum =
        typeof valorCardapio === 'number' && Number.isFinite(valorCardapio) ? valorCardapio : null

      let deltaPrecoVsCardapioPercentual: number | null = null
      if (valorCardapioNum != null && valorCardapioNum > 0) {
        deltaPrecoVsCardapioPercentual = ((precoMedioVenda - valorCardapioNum) / valorCardapioNum) * 100
      }

      const percentualFaturamento =
        valorTotalPeriodoVendas > 0 ? (r.valorTotal / valorTotalPeriodoVendas) * 100 : 0
      const percentualUnidades = sumQtdFiltrado > 0 ? (r.quantidade / sumQtdFiltrado) * 100 : 0

      let margemBrutaPercentual: number | null = null
      if (mockAtivo) {
        margemBrutaPercentual = 18 + (hashProdutoId(r.produtoId) % 25)
      }

      return {
        produtoId: r.produtoId,
        nome: r.nome,
        grupoId: r.grupoId,
        grupoNome: r.grupoNome,
        quantidade: r.quantidade,
        valorTotal: r.valorTotal,
        precoMedioVenda,
        percentualFaturamento,
        percentualUnidades,
        classeAbc: abcById.get(r.produtoId) ?? 'C',
        valorCardapio: valorCardapioNum,
        deltaPrecoVsCardapioPercentual,
        margemBrutaPercentual,
      }
    })

    const body: RelatorioProdutosVendidosResponseDTO = {
      items,
      totaisPeriodo: {
        quantidadeTotal: quantidadeTotalPeriodo,
        valorTotal: valorTotalPeriodoVendas,
        skusDistintos,
      },
      totalFiltrado,
      limit,
      offset,
      mockAtivo,
    }

    return NextResponse.json(body)
  } catch (error) {
    console.error('Erro em /api/relatorios/produtos-vendidos:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao montar relatório de produtos vendidos.' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno ao montar relatório de produtos vendidos.' }, { status: 500 })
  }
}

function isSort(s: string): s is RelatorioProdutosVendidosSort {
  return (
    s === 'quantidade_desc' ||
    s === 'quantidade_asc' ||
    s === 'valor_desc' ||
    s === 'valor_asc'
  )
}

function parseOptionalNumber(raw: string | null): number | null {
  if (raw == null || raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function normalizeBusca(raw: string | null): string | null {
  if (raw == null) return null
  const t = raw.trim().toLowerCase()
  return t.length > 0 ? t : null
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw == null || raw.trim() === '') return fallback
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

function compareLinhas(
  a: { quantidade: number; valorTotal: number; nome: string },
  b: { quantidade: number; valorTotal: number; nome: string },
  sort: RelatorioProdutosVendidosSort
): number {
  switch (sort) {
    case 'quantidade_desc':
      return b.quantidade - a.quantidade || b.valorTotal - a.valorTotal
    case 'quantidade_asc':
      return a.quantidade - b.quantidade || a.valorTotal - b.valorTotal
    case 'valor_desc':
      return b.valorTotal - a.valorTotal || b.quantidade - a.quantidade
    case 'valor_asc':
      return a.valorTotal - b.valorTotal || a.quantidade - b.quantidade
    default:
      return b.quantidade - a.quantidade
  }
}

function hashProdutoId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
