import {
  obterPedidoDeliveryDetalheCache,
  salvarPedidoDeliveryDetalheCache,
} from '@/src/infrastructure/api/pedidoDeliveryDetalheCache'
import { logImpressao, warnImpressao, erroImpressao } from '@/src/shared/utils/logImpressaoDelivery'

export type FetchPedidoDeliveryDetalheResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error?: string }

export type FetchPedidoDeliveryDetalheOptions = {
  /** Quando true, ignora cache em memória e busca na API. */
  forcarAtualizacao?: boolean
}

/**
 * GET `/api/delivery/pedidos/:id` — detalhe expandido do pedido delivery.
 * Reutiliza cache populado pelo quick view / sincronização do Kanban quando disponível.
 */
export async function fetchPedidoDeliveryDetalhe(
  vendaId: string,
  accessToken: string | undefined,
  options?: FetchPedidoDeliveryDetalheOptions
): Promise<FetchPedidoDeliveryDetalheResult> {
  const token = accessToken?.trim()
  if (!token) {
    warnImpressao('fetchPedidoDelivery.abort', { motivo: 'sem_token', vendaId })
    return { ok: false, status: 401, error: 'Sem token' }
  }

  if (!options?.forcarAtualizacao) {
    const cached = obterPedidoDeliveryDetalheCache(vendaId)
    if (cached && Object.keys(cached).length > 0) {
      logImpressao('fetchPedidoDelivery.cache_hit', {
        vendaId,
        numeroVenda: cached.numeroVenda,
      })
      return { ok: true, data: cached }
    }
  }

  logImpressao('fetchPedidoDelivery.inicio', { vendaId })

  const res = await fetch(`/api/delivery/pedidos/${encodeURIComponent(vendaId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    let err = ''
    try {
      const j = (await res.json()) as { error?: string }
      err = j.error ?? ''
    } catch {
      /* ignore */
    }
    erroImpressao('fetchPedidoDelivery.http_erro', {
      vendaId,
      status: res.status,
      mensagemApi: err || null,
    })
    return { ok: false, status: res.status, error: err }
  }

  const raw = await res.json()
  const data = salvarPedidoDeliveryDetalheCache(vendaId, raw)
  logImpressao('fetchPedidoDelivery.ok', {
    vendaId,
    numeroVenda: data.numeroVenda,
    qProdutos: Array.isArray(data.produtosLancados) ? data.produtosLancados.length : 0,
  })
  return { ok: true, data }
}
