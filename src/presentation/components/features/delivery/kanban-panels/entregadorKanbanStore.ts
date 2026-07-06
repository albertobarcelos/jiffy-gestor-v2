import { salvarPedidoDeliveryDetalheCache } from '@/src/infrastructure/api/pedidoDeliveryDetalheCache'

const entregadorPorVendaId = new Map<string, string>()
const entregadorAusentePorVendaId = new Set<string>()
/** IDs com GET de hidratação já disparado (evita duplicata quando colunas carregam em paralelo). */
const entregadorHydrationSolicitadaPorVendaId = new Set<string>()

export function marcarEntregadorHydrationSolicitada(vendaId: string): void {
  entregadorHydrationSolicitadaPorVendaId.add(vendaId)
}

export function entregadorHydrationJaSolicitada(vendaId: string): boolean {
  return entregadorHydrationSolicitadaPorVendaId.has(vendaId)
}

export function definirEntregadorKanbanCache(
  vendaId: string,
  entregadorId: string | null | undefined
): void {
  const id = String(entregadorId ?? '').trim()
  if (id) {
    entregadorPorVendaId.set(vendaId, id)
    entregadorAusentePorVendaId.delete(vendaId)
  } else {
    entregadorPorVendaId.delete(vendaId)
  }
}

export function marcarEntregadorKanbanAusente(vendaId: string): void {
  entregadorAusentePorVendaId.add(vendaId)
  entregadorPorVendaId.delete(vendaId)
}

export function entregadorKanbanJaVerificado(vendaId: string): boolean {
  return entregadorPorVendaId.has(vendaId) || entregadorAusentePorVendaId.has(vendaId)
}

export function obterEntregadorKanbanCache(vendaId: string): string | null {
  return entregadorPorVendaId.get(vendaId) ?? null
}

export async function resolverEntregadorIdVendaKanban(args: {
  vendaId: string
  tabelaOrigem: 'venda' | 'venda_gestor'
  token: string
  cacheLocal?: Record<string, string>
  /**
   * Ignora caches negativos (ausente) e hidratação ainda em andamento, forçando um GET
   * autoritativo. Usado antes de despachar: a hidratação em background pode ter marcado
   * `hydrationJaSolicitada` mas ainda não ter resolvido o fetch, o que retornaria `null`
   * (falso "sem entregador") e abortaria a transição.
   */
  forcarRevalidacao?: boolean
}): Promise<string | null> {
  const { vendaId, tabelaOrigem, token, cacheLocal, forcarRevalidacao } = args

  const doCacheLocal = cacheLocal?.[vendaId]?.trim()
  if (doCacheLocal) return doCacheLocal

  const doCacheGlobal = obterEntregadorKanbanCache(vendaId)
  if (doCacheGlobal) return doCacheGlobal

  if (!forcarRevalidacao) {
    if (entregadorAusentePorVendaId.has(vendaId)) {
      return null
    }

    if (entregadorHydrationJaSolicitada(vendaId)) {
      return obterEntregadorKanbanCache(vendaId)
    }
  }

  marcarEntregadorHydrationSolicitada(vendaId)

  const url =
    tabelaOrigem === 'venda_gestor'
      ? `/api/delivery/pedidos/${encodeURIComponent(vendaId)}`
      : `/api/vendas/${vendaId}?incluirFiscal=false`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!response.ok && tabelaOrigem === 'venda_gestor') {
      const fallback = await fetch(`/api/vendas/gestor/${vendaId}?incluirFiscal=false`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      })
      if (!fallback.ok) {
        marcarEntregadorKanbanAusente(vendaId)
        return null
      }
      const fallbackData = (await fallback.json()) as Record<string, unknown>
      const entregadorIdFallback = String(fallbackData.entregadorId ?? '').trim()
      if (entregadorIdFallback) {
        definirEntregadorKanbanCache(vendaId, entregadorIdFallback)
        return entregadorIdFallback
      }
      marcarEntregadorKanbanAusente(vendaId)
      return null
    }
    if (!response.ok) {
      marcarEntregadorKanbanAusente(vendaId)
      return null
    }

    const data = (await response.json()) as Record<string, unknown>
    if (tabelaOrigem === 'venda_gestor' && url.includes('/api/delivery/pedidos/')) {
      salvarPedidoDeliveryDetalheCache(vendaId, data)
    }
    const entregadorRaw =
      data.entregador && typeof data.entregador === 'object'
        ? (data.entregador as Record<string, unknown>).id
        : data.entregadorId
    const entregadorId = String(entregadorRaw ?? '').trim()
    if (entregadorId) {
      definirEntregadorKanbanCache(vendaId, entregadorId)
      return entregadorId
    }

    marcarEntregadorKanbanAusente(vendaId)
    return null
  } catch {
    marcarEntregadorKanbanAusente(vendaId)
    return null
  }
}

export async function salvarEntregadorPedidoDelivery(args: {
  vendaId: string
  /** `null` remove o entregador do pedido (envia `entregadorId: null` no PATCH). */
  entregadorId: string | null
  token: string
}): Promise<Record<string, unknown>> {
  const { vendaId, entregadorId, token } = args
  const entregadorIdNormalizado = entregadorId?.trim() ? entregadorId.trim() : null

  const response = await fetch(`/api/delivery/pedidos/${encodeURIComponent(vendaId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ entregadorId: entregadorIdNormalizado }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      (errorData as { error?: string; message?: string }).error ||
        (errorData as { error?: string; message?: string }).message ||
        (entregadorIdNormalizado ? 'Erro ao vincular entregador' : 'Erro ao remover entregador')
    )
  }

  const pedidoRaw = await response.json().catch(() => ({}))
  const pedido = salvarPedidoDeliveryDetalheCache(vendaId, pedidoRaw)

  if (entregadorIdNormalizado) {
    definirEntregadorKanbanCache(vendaId, entregadorIdNormalizado)
  } else {
    marcarEntregadorKanbanAusente(vendaId)
  }

  return pedido
}

/** @deprecated Use `salvarEntregadorPedidoDelivery` — mantido para compatibilidade de imports. */
export async function salvarEntregadorVendaGestor(args: {
  vendaId: string
  entregadorId: string | null
  token: string
}): Promise<Record<string, unknown>> {
  return salvarEntregadorPedidoDelivery(args)
}

export type VendaEntregadorKanbanRef = {
  id: string
  tabelaOrigem: 'venda' | 'venda_gestor'
  tipoVenda: string | null
  entregador?: { id: string } | null
}

function vendaKanbanPrecisaEntregador(v: VendaEntregadorKanbanRef): boolean {
  return String(v.tipoVenda ?? '').trim().toLowerCase() === 'entrega'
}

/** Preenche cache a partir do summary (listagem) — evita GET por card. */
export function hidratarEntregadoresKanbanDesdeSummary(
  vendas: VendaEntregadorKanbanRef[]
): Record<string, string> {
  const updates: Record<string, string> = {}

  for (const venda of vendas) {
    if (!vendaKanbanPrecisaEntregador(venda)) continue
    const entregadorId = String(venda.entregador?.id ?? '').trim()
    if (entregadorId) {
      definirEntregadorKanbanCache(venda.id, entregadorId)
      updates[venda.id] = entregadorId
      continue
    }

    // Listagem delivery já informa ausência (`entregador: null`) — não buscar detalhe por card.
    if (venda.tabelaOrigem === 'venda_gestor') {
      marcarEntregadorKanbanAusente(venda.id)
    }
  }

  return updates
}

/** Limite de GETs paralelos ao hidratar entregadores sem summary na listagem. */
export const ENTRAGADOR_KANBAN_HYDRATION_CONCURRENCY = 5

async function executarComConcorrencia<T>(
  items: T[],
  concorrencia: number,
  executar: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) return
  const fila = [...items]
  const workers = Array.from(
    { length: Math.min(concorrencia, fila.length) },
    async () => {
      while (fila.length > 0) {
        const item = fila.shift()
        if (item == null) break
        await executar(item)
      }
    }
  )
  await Promise.all(workers)
}

/**
 * Preenche mapa vendaId → entregadorId a partir do cache em memória ou GET da venda.
 * Usado ao montar o Kanban delivery para manter o ícone "secondary" após reload.
 */
export async function hidratarEntregadoresKanbanDesdeApi(args: {
  vendas: VendaEntregadorKanbanRef[]
  token: string
  idsJaConhecidos?: ReadonlySet<string>
}): Promise<Record<string, string>> {
  const { vendas, token, idsJaConhecidos } = args
  const updates: Record<string, string> = {}
  const precisaFetch: VendaEntregadorKanbanRef[] = []

  for (const venda of vendas) {
    if (!vendaKanbanPrecisaEntregador(venda)) continue
    if (idsJaConhecidos?.has(venda.id)) continue

    const doSummary = String(venda.entregador?.id ?? '').trim()
    if (doSummary) {
      definirEntregadorKanbanCache(venda.id, doSummary)
      updates[venda.id] = doSummary
      continue
    }

    if (venda.tabelaOrigem === 'venda_gestor') {
      marcarEntregadorKanbanAusente(venda.id)
      continue
    }

    if (entregadorKanbanJaVerificado(venda.id)) {
      const cached = obterEntregadorKanbanCache(venda.id)
      if (cached) updates[venda.id] = cached
      continue
    }

    if (entregadorHydrationJaSolicitada(venda.id)) continue

    precisaFetch.push(venda)
  }

  await executarComConcorrencia(
    precisaFetch,
    ENTRAGADOR_KANBAN_HYDRATION_CONCURRENCY,
    async venda => {
      const entregadorId = await resolverEntregadorIdVendaKanban({
        vendaId: venda.id,
        tabelaOrigem: venda.tabelaOrigem,
        token,
      })
      if (entregadorId) {
        updates[venda.id] = entregadorId
      }
    }
  )

  return updates
}
