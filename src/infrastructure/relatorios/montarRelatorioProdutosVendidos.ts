import type { ApiClient } from '@/src/infrastructure/api/apiClient'
import {
  type VendaDetalheProdutos,
  type CardapioProdutoMini,
  agregarProdutosLancadosPorProdutoId,
  buscarCardapioMiniPorProdutoIds,
  buscarDetalhesVendasComProdutosLancados,
  listarIdsVendasFinalizadasNoPeriodo,
  somarValorFinalDasVendas,
} from '@/src/infrastructure/dashboard/agregarVendasPorProdutoPdv'
import type {
  RelatorioProdutoVendidoClasseAbc,
  RelatorioProdutoVendidoLinhaDTO,
  RelatorioProdutosVendidosResponseDTO,
  RelatorioProdutosVendidosSort,
} from '@/src/shared/types/relatoriosProdutosVendidosApi'

/** Linha após filtros antes da ordenação final / paginação. */
export type LinhaRelatorioProdutoInterna = {
  produtoId: string
  nome: string
  grupoId: string | null
  grupoNome: string | null
  quantidade: number
  valorTotal: number
}

export type ExecRelatorioProdutosVendidosInput = {
  apiClient: ApiClient
  headers: Record<string, string>
  /** Intervalo vindos de `montarParamsVendasPdvPeriodo` (somente datas de finalização). */
  paramsIntervaloPdV: URLSearchParams
  sort: RelatorioProdutosVendidosSort
  grupoIdSet: Set<string> | null
  valorMin: number | null
  valorMax: number | null
  qtdMin: number | null
  qtdMax: number | null
  qBusca: string | null
  limit: number
  offset: number
}

export type ExecRelatorioProdutosVendidosResult = {
  body: RelatorioProdutosVendidosResponseDTO
  detalhes: VendaDetalheProdutos[]
  miniMap: Map<string, CardapioProdutoMini>
  linhasFiltradasOrdenadas: LinhaRelatorioProdutoInterna[]
  sumQtdFiltrado: number
  sumValorFiltrado: number
  valorTotalPeriodoVendas: number
  quantidadeTotalPeriodo: number
  skusDistintos: number
}

export async function executarRelatorioProdutosVendidosPipeline(
  opts: ExecRelatorioProdutosVendidosInput
): Promise<ExecRelatorioProdutosVendidosResult> {
  const {
    apiClient,
    headers,
    paramsIntervaloPdV,
    sort,
    grupoIdSet,
    valorMin,
    valorMax,
    qtdMin,
    qtdMax,
    qBusca,
    limit,
    offset,
  } = opts

  const vendaIdsArray = await listarIdsVendasFinalizadasNoPeriodo({
    apiClient,
    headers,
    paramsComIntervalo: paramsIntervaloPdV,
  })

  if (vendaIdsArray.length === 0) {
    return {
      body: {
        items: [],
        totaisPeriodo: { quantidadeTotal: 0, valorTotal: 0, skusDistintos: 0 },
        totaisFiltrados: { quantidade: 0, valor: 0 },
        totalFiltrado: 0,
        limit,
        offset,
      },
      detalhes: [],
      miniMap: new Map(),
      linhasFiltradasOrdenadas: [],
      sumQtdFiltrado: 0,
      sumValorFiltrado: 0,
      valorTotalPeriodoVendas: 0,
      quantidadeTotalPeriodo: 0,
      skusDistintos: 0,
    }
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

  const linhas: LinhaRelatorioProdutoInterna[] = Array.from(aggregationByProdutoId.entries()).map(
    ([produtoId, agg]) => {
      const mini = miniMap.get(produtoId)
      return {
        produtoId,
        nome: mini?.nome ?? 'Produto Desconhecido',
        grupoId: mini?.grupoId ?? null,
        grupoNome: mini?.nomeGrupo ?? null,
        quantidade: agg.quantidade,
        valorTotal: agg.valorTotal,
      }
    }
  )

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

  const abcById = calcularAbcPorProdutoId(filtradas, sumValorFiltrado)

  const totalFiltrado = filtradas.length
  const items = montarItemsRelatorioPagina({
    linhas: filtradas,
    miniMap,
    abcById,
    offset,
    limit,
    valorTotalPeriodoVendas,
    sumQtdFiltrado,
  })

  const body: RelatorioProdutosVendidosResponseDTO = {
    items,
    totaisPeriodo: {
      quantidadeTotal: quantidadeTotalPeriodo,
      valorTotal: valorTotalPeriodoVendas,
      skusDistintos,
    },
    totaisFiltrados: {
      quantidade: sumQtdFiltrado,
      valor: sumValorFiltrado,
    },
    totalFiltrado,
    limit,
    offset,
  }

  return {
    body,
    detalhes,
    miniMap,
    linhasFiltradasOrdenadas: filtradas,
    sumQtdFiltrado,
    sumValorFiltrado,
    valorTotalPeriodoVendas,
    quantidadeTotalPeriodo,
    skusDistintos,
  }
}

export function calcularAbcPorProdutoId(
  linhas: LinhaRelatorioProdutoInterna[],
  sumValorFiltrado: number
): Map<string, RelatorioProdutoVendidoClasseAbc> {
  const porValorDesc = [...linhas].sort((a, b) => b.valorTotal - a.valorTotal)
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
  return abcById
}

export function montarItemsRelatorioPagina(args: {
  linhas: LinhaRelatorioProdutoInterna[]
  miniMap: Map<string, CardapioProdutoMini>
  abcById: Map<string, RelatorioProdutoVendidoClasseAbc>
  offset: number
  limit: number
  valorTotalPeriodoVendas: number
  sumQtdFiltrado: number
}): RelatorioProdutoVendidoLinhaDTO[] {
  const {
    linhas,
    miniMap,
    abcById,
    offset,
    limit,
    valorTotalPeriodoVendas,
    sumQtdFiltrado,
  } = args

  const slice = linhas.slice(offset, offset + limit)

  return slice.map(r => {
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
    }
  })
}

/** Monta `body` paginado reutilizando agregação já em cache (lista infinita). */
export function montarBodyPaginadoFromAgregado(
  agregado: ExecRelatorioProdutosVendidosResult,
  offset: number,
  limit: number
): RelatorioProdutosVendidosResponseDTO {
  const abcById = calcularAbcPorProdutoId(agregado.linhasFiltradasOrdenadas, agregado.sumValorFiltrado)
  const items = montarItemsRelatorioPagina({
    linhas: agregado.linhasFiltradasOrdenadas,
    miniMap: agregado.miniMap,
    abcById,
    offset,
    limit,
    valorTotalPeriodoVendas: agregado.valorTotalPeriodoVendas,
    sumQtdFiltrado: agregado.sumQtdFiltrado,
  })
  const totalFiltrado = agregado.linhasFiltradasOrdenadas.length
  const proximoOffset = offset + items.length

  return {
    items,
    totaisPeriodo: agregado.body.totaisPeriodo,
    totaisFiltrados: {
      quantidade: agregado.sumQtdFiltrado,
      valor: agregado.sumValorFiltrado,
    },
    totalFiltrado,
    limit,
    offset,
    temMais: proximoOffset < totalFiltrado,
    nextOffset: proximoOffset < totalFiltrado ? proximoOffset : null,
  }
}

/** Parse opcional número query (valorMin, etc.). */
export function parseOptionalNumberRelatorio(raw: string | null): number | null {
  if (raw == null || raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function normalizeBuscaRelatorio(raw: string | null): string | null {
  if (raw == null) return null
  const t = raw.trim().toLowerCase()
  return t.length > 0 ? t : null
}

export function clampIntRelatorio(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw == null || raw.trim() === '') return fallback
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

export function parseSortRelatorio(s: string): RelatorioProdutosVendidosSort {
  const t = s.trim()
  if (
    t === 'quantidade_desc' ||
    t === 'quantidade_asc' ||
    t === 'valor_desc' ||
    t === 'valor_asc'
  ) {
    return t
  }
  return 'quantidade_desc'
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

