import { ApiClient } from '@/src/infrastructure/api/apiClient'
import {
  appendIntervaloFinalizacaoVendasPdv,
  lerIntervaloFinalizacaoVendasPdv,
} from '@/src/shared/utils/parametrosDataFinalizacaoVendasPdv'
import { calcularPeriodoNoFusoEmpresa } from '@/src/shared/utils/periodoNoFusoEmpresa'

const MAP_OPCAO_PERIODO: Record<string, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  semana: 'Últimos 7 Dias',
  '30dias': 'Últimos 30 Dias',
  mes: 'Mês Atual',
  '60dias': 'Últimos 60 Dias',
  '90dias': 'Últimos 90 Dias',
}

export type VendaDetalheProdutos = {
  produtosLancados?: Array<{
    produtoId: string
    quantidade: number
    valorFinal: number
    removido?: boolean
  }>
} | null

export type AgregacaoPorProdutoId = Map<string, { quantidade: number; valorTotal: number }>

export type CardapioProdutoMini = {
  nome: string
  grupoId?: string
  nomeGrupo?: string
  valorCardapio?: number
}

/**
 * Monta URLSearchParams com intervalo de finalização (mesma regra do dashboard / top-produtos).
 * Não inclui `status`, `limit` nem `offset`.
 */
export function montarParamsVendasPdvPeriodo(args: {
  requestSearchParams: URLSearchParams
  periodo: string
  timezone: string
}): URLSearchParams {
  const { requestSearchParams, periodo, timezone } = args
  const params = new URLSearchParams()
  const intervaloCustom = lerIntervaloFinalizacaoVendasPdv(requestSearchParams)
  if (intervaloCustom) {
    appendIntervaloFinalizacaoVendasPdv(params, intervaloCustom)
  } else {
    const opcao = MAP_OPCAO_PERIODO[periodo] || 'Hoje'
    const { inicio, fim } = calcularPeriodoNoFusoEmpresa(opcao, timezone)
    if (inicio && fim) {
      appendIntervaloFinalizacaoVendasPdv(params, { inicial: inicio.toISOString(), final: fim.toISOString() })
    }
  }
  return params
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

/**
 * Lista todos os IDs de vendas FINALIZADAS no período (paginação interna 100 em 100).
 */
export async function listarIdsVendasFinalizadasNoPeriodo(args: {
  apiClient: ApiClient
  headers: Record<string, string>
  paramsComIntervalo: URLSearchParams
}): Promise<string[]> {
  const { apiClient, headers, paramsComIntervalo } = args
  const params = new URLSearchParams(paramsComIntervalo.toString())
  params.append('status', 'FINALIZADA')

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
    items.forEach(v => {
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
        totalPages = 200
      }
    }

    if (items.length < limitPerPage) {
      break
    }

    page++
  }

  return Array.from(vendaIds)
}

export async function buscarDetalhesVendasComProdutosLancados(args: {
  apiClient: ApiClient
  headers: Record<string, string>
  vendaIds: string[]
  concurrency?: number
}): Promise<VendaDetalheProdutos[]> {
  const { apiClient, headers, vendaIds, concurrency = 10 } = args
  if (vendaIds.length === 0) return []

  return fetchWithConcurrency(vendaIds, concurrency, async vendaId => {
    try {
      const resp = await apiClient.request<VendaDetalheProdutos>(
        `/api/v1/operacao-pdv/vendas/${vendaId}`,
        { method: 'GET', headers }
      )
      return resp.data
    } catch {
      return null
    }
  })
}

/** Agrega quantidade e valor por produtoId; ignora itens removidos. */
export function agregarProdutosLancadosPorProdutoId(detalhes: VendaDetalheProdutos[]): AgregacaoPorProdutoId {
  const aggregationByProdutoId = new Map<string, { quantidade: number; valorTotal: number }>()

  for (const venda of detalhes) {
    if (!venda?.produtosLancados) continue
    for (const p of venda.produtosLancados) {
      if (!p?.produtoId) continue
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

  return aggregationByProdutoId
}

/**
 * Soma o `valorFinal` de cada venda (total da comanda no PDV).
 * Usar para totais de **faturamento do período** alinhados ao Top Garçons e ao resumo financeiro,
 * pois a soma dos `valorFinal` das linhas de `produtosLancados` pode ser menor (taxas, taxa de serviço,
 * entrega, acréscimos fora de produto, etc.).
 */
export function somarValorFinalDasVendas(
  detalhes: Array<VendaDetalheProdutos | null | undefined>
): number {
  let total = 0
  for (const venda of detalhes) {
    if (!venda || typeof venda !== 'object') continue
    const o = venda as Record<string, unknown>
    const vf = o.valorFinal
    if (typeof vf === 'number' && Number.isFinite(vf)) {
      total += vf
    } else if (typeof vf === 'string' && vf.trim() !== '') {
      const n = parseFloat(vf)
      if (Number.isFinite(n)) total += n
    }
  }
  return total
}

function parseCardapioMini(data: unknown): CardapioProdutoMini {
  if (!data || typeof data !== 'object') {
    return { nome: 'Produto Desconhecido' }
  }
  const d = data as Record<string, unknown>
  const nomeRaw = d.nome
  const nome =
    typeof nomeRaw === 'string' && nomeRaw.trim() !== '' ? nomeRaw.trim() : 'Produto Desconhecido'
  const grupoId = typeof d.grupoId === 'string' && d.grupoId.trim() !== '' ? d.grupoId : undefined
  const nomeGrupo =
    typeof d.nomeGrupo === 'string' && d.nomeGrupo.trim() !== '' ? d.nomeGrupo.trim() : undefined
  const valorRaw = d.valor
  let valorCardapio: number | undefined
  if (typeof valorRaw === 'number' && Number.isFinite(valorRaw)) {
    valorCardapio = valorRaw
  } else if (valorRaw != null) {
    const n = parseFloat(String(valorRaw))
    if (Number.isFinite(n)) valorCardapio = n
  }
  return { nome, grupoId, nomeGrupo, valorCardapio }
}

/**
 * Busca nome, grupo e preço de cardápio por ID (com cache global no servidor).
 */
export async function buscarCardapioMiniPorProdutoIds(args: {
  apiClient: ApiClient
  headers: Record<string, string>
  produtoIds: string[]
  concurrency?: number
}): Promise<Map<string, CardapioProdutoMini>> {
  const { apiClient, headers, produtoIds, concurrency = 10 } = args
  const cache =
    globalThis.__jiffyProdutoCardapioMiniCache ??
    (globalThis.__jiffyProdutoCardapioMiniCache = new Map<string, CardapioProdutoMini>())

  const result = new Map<string, CardapioProdutoMini>()

  const snapshots = await fetchWithConcurrency(produtoIds, concurrency, async produtoId => {
    const cached = cache.get(produtoId)
    if (cached) return { produtoId, mini: cached }
    try {
      const resp = await apiClient.request<unknown>(`/api/v1/cardapio/produtos/${produtoId}`, {
        method: 'GET',
        headers,
      })
      const mini = parseCardapioMini(resp.data)
      cache.set(produtoId, mini)
      return { produtoId, mini }
    } catch {
      const mini: CardapioProdutoMini = { nome: 'Produto Desconhecido' }
      cache.set(produtoId, mini)
      return { produtoId, mini }
    }
  })

  snapshots.forEach(({ produtoId, mini }) => {
    result.set(produtoId, mini)
  })

  return result
}
