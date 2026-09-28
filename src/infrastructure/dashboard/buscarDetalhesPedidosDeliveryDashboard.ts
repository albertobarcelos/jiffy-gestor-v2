import type { ApiClient } from '@/src/infrastructure/api/apiClient'
import type {
  AgregacaoPorProdutoId,
  VendaDetalheProdutos,
} from '@/src/infrastructure/dashboard/agregarVendasPorProdutoPdv'
import { pedidoDeliveryEhFinalizado } from '@/src/infrastructure/dashboard/agregarMetricasDeliveryDashboard'
import type { PedidoDeliverySummaryApi } from '@/src/application/dto/api/pedidoDeliveryListApi'

export function mesclarAgregacaoPorProdutoId(
  destino: AgregacaoPorProdutoId,
  extra: AgregacaoPorProdutoId
): AgregacaoPorProdutoId {
  for (const [id, agg] of extra) {
    const existente = destino.get(id)
    if (existente) {
      existente.quantidade += agg.quantidade
      existente.valorTotal += agg.valorTotal
    } else {
      destino.set(id, { quantidade: agg.quantidade, valorTotal: agg.valorTotal })
    }
  }
  return destino
}

function unwrapRegistro(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {}
  const obj = raw as Record<string, unknown>
  if (obj.data != null && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    return obj.data as Record<string, unknown>
  }
  return obj
}

function numeroSeguro(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Converte o GET delivery no shape que o Top Produtos já agrega (PDV). */
export function detalhePedidoDeliveryParaProdutosDashboard(raw: unknown): VendaDetalheProdutos & {
  valorFinal?: number
} {
  const registro = unwrapRegistro(raw)
  const lista = Array.isArray(registro.produtosLancados)
    ? registro.produtosLancados
    : Array.isArray(registro.produtos)
      ? registro.produtos
      : []

  const produtosLancados = lista
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map(item => {
      const quantidade = numeroSeguro(item.quantidade)
      const valorFinalLinha =
        item.valorFinal != null ? numeroSeguro(item.valorFinal) : quantidade * numeroSeguro(item.valorUnitario)
      return {
        produtoId: String(item.produtoId ?? '').trim(),
        quantidade,
        valorFinal: valorFinalLinha,
        removido: item.removido === true,
      }
    })
    .filter(item => item.produtoId)

  return {
    valorFinal: numeroSeguro(registro.valorFinal),
    produtosLancados,
  }
}

export function idsPedidosDeliveryFinalizados(pedidos: PedidoDeliverySummaryApi[]): string[] {
  return pedidos
    .filter(pedido => pedidoDeliveryEhFinalizado(pedido))
    .map(pedido => String(pedido.id ?? '').trim())
    .filter(Boolean)
}

async function fetchComConcorrencia<T, R>(
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

/** Busca o detalhe só dos FINALIZADO para somar produtos no dashboard. */
export async function buscarDetalhesPedidosDeliveryDashboard(input: {
  apiClient: ApiClient
  headers: HeadersInit
  pedidoIds: string[]
  concurrency?: number
}): Promise<Array<VendaDetalheProdutos & { valorFinal?: number }>> {
  const { apiClient, headers, pedidoIds, concurrency = 20 } = input
  if (pedidoIds.length === 0) return []

  const detalhes = await fetchComConcorrencia(pedidoIds, concurrency, async id => {
    try {
      const response = await apiClient.request<unknown>(
        `/api/v1/delivery/pedidos/${encodeURIComponent(id)}`,
        { method: 'GET', headers }
      )
      return detalhePedidoDeliveryParaProdutosDashboard(response.data)
    } catch {
      return null
    }
  })

  return detalhes.filter((item): item is VendaDetalheProdutos & { valorFinal?: number } => item != null)
}
