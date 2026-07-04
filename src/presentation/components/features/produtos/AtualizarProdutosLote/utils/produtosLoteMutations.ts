import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { FiscalLoteRequestPayload } from '../rules/fiscalLote.rules'

/** Payload item para POST /api/produtos/bulk-update (abas não fiscais). */
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
}

export type BulkUpdateProdutosLoteResponse = {
  success?: boolean
  totalUpdated?: number
  produtosIds?: string[]
  falhas?: Array<{ produtoId: string; message: string }>
}

export type FiscalLoteApiResponse = {
  total?: number
  criados?: number
  atualizados?: number
  erros?: number
  produtos?: Array<{ produtoId?: string }>
  errosDetalhe?: Array<{ produtoId?: string; mensagem?: string; campo?: string }>
  message?: string
}

export async function bulkUpdateProdutosLote(
  token: string,
  payload: BulkUpdateProdutoPayloadItem[]
): Promise<BulkUpdateProdutosLoteResponse> {
  const response = await fetchGestorApi('/api/produtos/bulk-update', {
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

/** PATCH /api/produtos/fiscal/lote — atualização fiscal em massa. */
export async function atualizarFiscalProdutosLote(
  token: string,
  payload: FiscalLoteRequestPayload
): Promise<{ status: number; data: FiscalLoteApiResponse }> {
  const response = await fetchGestorApi('/api/produtos/fiscal/lote', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => ({}))) as FiscalLoteApiResponse
  return { status: response.status, data }
}

export async function patchProdutoLote(
  token: string,
  produtoId: string,
  body: Record<string, unknown>
): Promise<void> {
  const response = await fetchGestorApi(`/api/produtos/${produtoId}`, {
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
