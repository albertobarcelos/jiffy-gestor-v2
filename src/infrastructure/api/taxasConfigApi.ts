import {
  gestorConfigDelete,
  gestorConfigJson,
  type GestorConfigResult,
} from '@/src/infrastructure/api/gestorConfigRequest'

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
