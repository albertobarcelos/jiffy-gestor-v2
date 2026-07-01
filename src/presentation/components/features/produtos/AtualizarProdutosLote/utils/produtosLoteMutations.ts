/** Payload item para POST /api/produtos/bulk-update. */
export type BulkUpdateProdutoPayloadItem = {
  produtoId: string
  valor?: number
  impressorasIds?: string[]
  impressorasIdsToRemove?: string[]
  gruposComplementosIds?: string[]
  gruposComplementosIdsToRemove?: string[]
  favorito?: boolean
  permiteDesconto?: boolean
  permiteAcrescimo?: boolean
  permiteAlterarPreco?: boolean
  incideTaxa?: boolean
  abreComplementos?: boolean
  ncm?: string | null
  fiscal?: {
    ncm?: string | null
    cest?: string | null
    origemMercadoria?: number | null
    tipoProduto?: string | null
    indicadorProducaoEscala?: string | null
  }
}

export type BulkUpdateProdutosLoteResponse = {
  success?: boolean
  totalUpdated?: number
  produtosIds?: string[]
  falhas?: Array<{ produtoId: string; message: string }>
}

export async function bulkUpdateProdutosLote(
  token: string,
  payload: BulkUpdateProdutoPayloadItem[]
): Promise<BulkUpdateProdutosLoteResponse> {
  const response = await fetch('/api/produtos/bulk-update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => ({}))) as BulkUpdateProdutosLoteResponse & {
    message?: string
  }

  if (!response.ok) {
    const message =
      typeof data.message === 'string' && data.message.trim() !== ''
        ? data.message
        : `Erro ${response.status}`
    throw new Error(message)
  }

  return data
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
