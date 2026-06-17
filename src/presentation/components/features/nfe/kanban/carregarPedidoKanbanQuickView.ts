import {
  carregarPedidoKanbanQuickViewUseCase,
  type PedidoKanbanQuickViewData,
  type ProdutoKanbanQuickView,
} from '@/src/application/use-cases/vendas/CarregarPedidoKanbanQuickViewUseCase'

export type { PedidoKanbanQuickViewData, ProdutoKanbanQuickView }

const QUICK_VIEW_CACHE = new Map<string, PedidoKanbanQuickViewData>()
const QUICK_VIEW_INFLIGHT = new Map<string, Promise<PedidoKanbanQuickViewData>>()

function quickViewCacheKey(vendaId: string, tabelaOrigem: 'venda' | 'venda_gestor'): string {
  return `${tabelaOrigem}:${vendaId}`
}

export function obterPedidoKanbanQuickViewCache(args: {
  vendaId: string
  tabelaOrigem: 'venda' | 'venda_gestor'
}): PedidoKanbanQuickViewData | null {
  return QUICK_VIEW_CACHE.get(quickViewCacheKey(args.vendaId, args.tabelaOrigem)) ?? null
}

export async function carregarPedidoKanbanQuickView(args: {
  vendaId: string
  tabelaOrigem: 'venda' | 'venda_gestor'
  token: string
  tipoVenda?: 'entrega' | 'retirada' | null
  observacaoPedidoHint?: string | null
  /** Quando true, ignora cache em memória e busca dados frescos. */
  forcarAtualizacao?: boolean
}): Promise<PedidoKanbanQuickViewData> {
  const {
    vendaId,
    tabelaOrigem,
    token,
    tipoVenda,
    observacaoPedidoHint,
    forcarAtualizacao = false,
  } = args
  const cacheKey = quickViewCacheKey(vendaId, tabelaOrigem)

  if (!forcarAtualizacao) {
    const cached = QUICK_VIEW_CACHE.get(cacheKey)
    if (cached) return cached

    const inflight = QUICK_VIEW_INFLIGHT.get(cacheKey)
    if (inflight) return inflight
  }

  const promise = carregarPedidoKanbanQuickViewUseCase
    .execute({ vendaId, tabelaOrigem, token, tipoVenda, observacaoPedidoHint })
    .then(resultado => {
      QUICK_VIEW_CACHE.set(cacheKey, resultado)
      return resultado
    })
    .finally(() => {
      QUICK_VIEW_INFLIGHT.delete(cacheKey)
    })

  QUICK_VIEW_INFLIGHT.set(cacheKey, promise)
  return promise
}

export function invalidarPedidoKanbanQuickViewCache(vendaId: string): void {
  QUICK_VIEW_CACHE.delete(quickViewCacheKey(vendaId, 'venda'))
  QUICK_VIEW_CACHE.delete(quickViewCacheKey(vendaId, 'venda_gestor'))
}

