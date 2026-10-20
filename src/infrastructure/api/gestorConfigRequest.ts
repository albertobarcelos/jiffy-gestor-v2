import { fetchGestorApi } from '@/src/infrastructure/api/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'

export type GestorConfigResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string }

export function requireGestorConfig<T>(res: GestorConfigResult<T>): T {
  if (!res.ok) {
    throw new Error(res.error)
  }
  return res.data
}

function headersJson(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export async function gestorConfigJson<T = unknown>(
  path: string,
  token?: string,
  init: { method?: string; json?: unknown } = {}
): Promise<GestorConfigResult<T>> {
  const res = await fetchGestorApi(path, {
    method: init.method,
    headers: headersJson(token),
    body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
    cache: 'no-store',
  })
  const data = (await res.json().catch(() => ({}))) as T
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: textoErroCorpoApi(data) || `Erro ${res.status}`,
    }
  }
  return { ok: true, status: res.status, data }
}

export async function gestorConfigDelete(
  path: string,
  token: string
): Promise<GestorConfigResult<unknown>> {
  const res = await fetchGestorApi(path, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (res.status === 204 || res.ok) {
    return { ok: true, status: res.status, data: null }
  }
  const data = await res.json().catch(() => ({}))
  return {
    ok: false,
    status: res.status,
    error: textoErroCorpoApi(data) || `Erro ${res.status}`,
  }
}

export async function gestorConfigBlob(
  path: string,
  token: string
): Promise<Blob | null> {
  const res = await fetchGestorApi(path, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.blob()
}

export async function gestorConfigForm(
  path: string,
  token: string,
  form: FormData,
  method: string = 'POST'
): Promise<GestorConfigResult<unknown>> {
  const res = await fetchGestorApi(path, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: textoErroCorpoApi(data) || `Erro ${res.status}`,
    }
  }
  return { ok: true, status: res.status, data }
}
