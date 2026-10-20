import { gestorConfigJson, type GestorConfigResult } from '@/src/infrastructure/api/gestorConfigRequest'

export type ListaPaginada<T> = {
  items?: T[]
  count?: number
  total?: number
}

export function listarTerminaisPagina(
  token: string,
  params: { limit?: number; offset: number; q?: string }
): Promise<GestorConfigResult<ListaPaginada<Record<string, unknown>>>> {
  const qs = new URLSearchParams({
    offset: String(params.offset),
  })
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.q) qs.set('q', params.q)
  return gestorConfigJson(`/api/terminais?${qs.toString()}`, token)
}

export function patchTerminal(
  token: string,
  terminalId: string,
  body: Record<string, unknown>
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(`/api/terminais/${encodeURIComponent(terminalId)}`, token, {
    method: 'PATCH',
    json: body,
  })
}

export function criarTerminal(
  token: string,
  body: Record<string, unknown>
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson('/api/terminais', token, { method: 'POST', json: body })
}

export function getTerminalDetalhes(
  token: string,
  terminalId: string
): Promise<GestorConfigResult<Record<string, unknown>>> {
  return gestorConfigJson(
    `/api/terminais/${encodeURIComponent(terminalId)}/detalhes`,
    token
  )
}

export function listarPreferenciasPagina(
  token: string,
  params: { limit: number; offset: number; q?: string }
): Promise<GestorConfigResult<ListaPaginada<Record<string, unknown>>>> {
  const qs = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  })
  if (params.q) qs.set('q', params.q)
  return gestorConfigJson(`/api/preferencias-terminal?${qs.toString()}`, token)
}

export function getPreferenciaTerminal(
  token: string,
  terminalId: string
): Promise<GestorConfigResult<Record<string, unknown>>> {
  return gestorConfigJson(
    `/api/preferencias-terminal/${encodeURIComponent(terminalId)}`,
    token
  )
}

export function salvarPreferenciasTerminal(
  token: string,
  body: { terminaisId: string; fields: Record<string, unknown> }
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson('/api/preferencias-terminal', token, {
    method: 'PUT',
    json: body,
  })
}

export function listarImpressorasPagina(
  token: string,
  params: { limit: number; offset: number }
): Promise<GestorConfigResult<ListaPaginada<Record<string, unknown>>>> {
  const qs = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  })
  return gestorConfigJson(`/api/impressoras?${qs.toString()}`, token)
}
