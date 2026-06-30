/** Payload item para POST /api/produtos/bulk-update. */
export type BulkUpdateProdutoPayloadItem = {
  produtoId: string
  valor?: number
  impressorasIds?: string[]
  impressorasIdsToRemove?: string[]
  gruposComplementosIds?: string[]
  gruposComplementosIdsToRemove?: string[]
}

export async function bulkUpdateProdutosLote(
  token: string,
  payload: BulkUpdateProdutoPayloadItem[]
): Promise<void> {
  const response = await fetch('/api/produtos/bulk-update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message =
      typeof errorData.message === 'string' && errorData.message.trim() !== ''
        ? errorData.message
        : `Erro ${response.status}`
    throw new Error(message)
  }
}

export async function patchProdutoLote(
  token: string,
  produtoId: string,
  body: Record<string, unknown>
): Promise<void> {
  const response = await fetch(`/api/produtos/${produtoId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const msg =
      typeof error.message === 'string' && error.message.trim() !== ''
        ? error.message
        : `Erro ${response.status}`
    throw new Error(msg)
  }
}
