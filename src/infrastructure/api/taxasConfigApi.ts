import {
  gestorConfigDelete,
  gestorConfigJson,
  type GestorConfigResult,
} from '@/src/infrastructure/api/gestorConfigRequest'

export function listarTaxasPagina(
  token: string,
  params: { limit: number; offset: number; q?: string }
): Promise<GestorConfigResult<{ items?: Record<string, unknown>[]; count?: number }>> {
  const qs = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  })
  if (params.q) qs.set('q', params.q)
  return gestorConfigJson(`/api/taxas?${qs.toString()}`, token)
}

export function getTaxa(
  token: string,
  taxaId: string
): Promise<GestorConfigResult<Record<string, unknown>>> {
  return gestorConfigJson(`/api/taxas/${encodeURIComponent(taxaId)}`, token)
}

export function patchTaxa(
  token: string,
  taxaId: string,
  body: Record<string, unknown>
): Promise<GestorConfigResult<Record<string, unknown>>> {
  return gestorConfigJson(`/api/taxas/${encodeURIComponent(taxaId)}`, token, {
    method: 'PATCH',
    json: body,
  })
}

export function criarTaxa(
  token: string,
  body: Record<string, unknown>
): Promise<GestorConfigResult<Record<string, unknown>>> {
  return gestorConfigJson('/api/taxas', token, { method: 'POST', json: body })
}

export function excluirTaxa(
  token: string,
  taxaId: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigDelete(`/api/taxas/${encodeURIComponent(taxaId)}`, token)
}
