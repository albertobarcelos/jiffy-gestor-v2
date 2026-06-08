const entregadorPorVendaId = new Map<string, string>()
const entregadorAusentePorVendaId = new Set<string>()

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
}): Promise<string | null> {
  const { vendaId, tabelaOrigem, token, cacheLocal } = args

  const doCacheLocal = cacheLocal?.[vendaId]?.trim()
  if (doCacheLocal) return doCacheLocal

  const doCacheGlobal = obterEntregadorKanbanCache(vendaId)
  if (doCacheGlobal) return doCacheGlobal

  if (entregadorAusentePorVendaId.has(vendaId)) {
    return null
  }

  const url =
    tabelaOrigem === 'venda_gestor'
      ? `/api/vendas/gestor/${vendaId}?incluirFiscal=false`
      : `/api/vendas/${vendaId}?incluirFiscal=false`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!response.ok) return null

    const data = (await response.json()) as Record<string, unknown>
    const entregadorId = String(data.entregadorId ?? '').trim()
    if (entregadorId) {
      definirEntregadorKanbanCache(vendaId, entregadorId)
      return entregadorId
    }

    marcarEntregadorKanbanAusente(vendaId)
    return null
  } catch {
    return null
  }
}

export async function salvarEntregadorVendaGestor(args: {
  vendaId: string
  entregadorId: string
  token: string
}): Promise<void> {
  const { vendaId, entregadorId, token } = args
  const response = await fetch(`/api/vendas/gestor/${vendaId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ entregadorId }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      (errorData as { error?: string; message?: string }).error ||
        (errorData as { error?: string; message?: string }).message ||
        'Erro ao vincular entregador'
    )
  }

  definirEntregadorKanbanCache(vendaId, entregadorId)
}

export type VendaEntregadorKanbanRef = {
  id: string
  tabelaOrigem: 'venda' | 'venda_gestor'
  tipoVenda: string | null
}

function vendaKanbanPrecisaEntregador(v: VendaEntregadorKanbanRef): boolean {
  return String(v.tipoVenda ?? '').trim().toLowerCase() === 'entrega'
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
    if (entregadorKanbanJaVerificado(venda.id)) {
      const cached = obterEntregadorKanbanCache(venda.id)
      if (cached) updates[venda.id] = cached
      continue
    }

    precisaFetch.push(venda)
  }

  await Promise.all(
    precisaFetch.map(async venda => {
      const entregadorId = await resolverEntregadorIdVendaKanban({
        vendaId: venda.id,
        tabelaOrigem: venda.tabelaOrigem,
        token,
      })
      if (entregadorId) {
        updates[venda.id] = entregadorId
      }
    })
  )

  return updates
}
