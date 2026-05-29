const entregadorPorVendaId = new Map<string, string>()

export function definirEntregadorKanbanCache(
  vendaId: string,
  entregadorId: string | null | undefined
): void {
  const id = String(entregadorId ?? '').trim()
  if (id) {
    entregadorPorVendaId.set(vendaId, id)
  } else {
    entregadorPorVendaId.delete(vendaId)
  }
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
