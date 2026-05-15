import type { ConviteGestaoDTO } from '@/src/application/dto/convites/ConvitesGestaoDTO'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

export type PerfilGestorOption = { id: string; role: string }

export type UsuarioAceitoInfo = { id: string; nome: string }

/** Item de GET /api/pessoas/usuarios-gestor (lista paginada). */
export type UsuarioGestorListaItem = {
  id: string
  nome: string
  username: string
  perfilGestorName: string
  empresaId: string
  perfilGestorId: string
}

export interface ConvitesGestaoData {
  /** Todos os convites retornados pela API (estado bruto). */
  convitesTodos: ConviteGestaoDTO[]
  /** Todos os usuários gestor da empresa. */
  usuariosGestor: UsuarioGestorListaItem[]
  perfisList: PerfilGestorOption[]
}

export function emailGestaoKey(value: string): string {
  return value.toLowerCase().trim()
}

export function conviteEstaAceito(status: string): boolean {
  const u = status.trim().toUpperCase()
  return u === 'ACEITO' || u === 'ACCEPTED'
}

export function conviteEstaPendente(status: string): boolean {
  return status.trim().toUpperCase() === 'PENDENTE'
}

/**
 * Convites exibidos na lista: só PENDENTE, sem gestor com o mesmo e-mail
 * (quem já aceitou ou virou gestor aparece na seção de usuários gestor).
 */
export function filtrarConvitesParaLista(
  convites: ConviteGestaoDTO[],
  gestores: UsuarioGestorListaItem[]
): ConviteGestaoDTO[] {
  const emailsGestor = new Set(
    gestores.map(g => emailGestaoKey(g.username)).filter(Boolean)
  )
  return convites.filter(c => {
    if (!conviteEstaPendente(c.status)) return false
    const email = emailGestaoKey(c.email)
    return email.length > 0 && !emailsGestor.has(email)
  })
}

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => null)
  if (data && typeof data === 'object' && data !== null && 'error' in data) {
    return String((data as { error?: unknown }).error)
  }
  return `Erro ${res.status}`
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function fetchConvitesList(token: string): Promise<ConviteGestaoDTO[]> {
  const res = await fetchGestorApi('/api/convites', {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await parseError(res))
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function fetchPerfis(token: string): Promise<PerfilGestorOption[]> {
  const all: PerfilGestorOption[] = []
  let offset = 0
  const limit = 50

  for (let i = 0; i < 100; i++) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    const res = await fetchGestorApi(`/api/pessoas/perfis-gestor?${params.toString()}`, {
      headers: authHeaders(token),
    })
    if (!res.ok) break
    const data = (await res.json()) as { items?: Array<{ id?: unknown; role?: unknown }>; hasNext?: boolean }
    const items = data.items ?? []
    if (items.length === 0) break

    for (const item of items) {
      const id = item.id ? String(item.id).trim() : ''
      const role = item.role ? String(item.role).trim() : ''
      if (id && role) all.push({ id, role })
    }

    if (!data.hasNext) break
    offset += items.length
  }

  return all
}

function normalizarNomeGestor(raw: string | undefined): string {
  const n = (raw ?? '').trim()
  if (!n || n.toUpperCase() === 'SEM NOME') return ''
  return n
}

function parseUsuarioGestorItem(raw: unknown): UsuarioGestorListaItem | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = o.id != null ? String(o.id).trim() : ''
  const username = o.username != null ? String(o.username).trim() : ''
  if (!id || !username) return null
  return {
    id,
    username,
    nome: normalizarNomeGestor(o.nome != null ? String(o.nome) : undefined),
    perfilGestorName: o.perfilGestorName != null ? String(o.perfilGestorName).trim() : '—',
    empresaId: o.empresaId != null ? String(o.empresaId).trim() : '',
    perfilGestorId: o.perfilGestorId != null ? String(o.perfilGestorId).trim() : '',
  }
}

/**
 * Lista todos os usuários gestor (paginação local até esgotar `items`).
 */
export async function fetchTodosUsuariosGestor(token: string): Promise<UsuarioGestorListaItem[]> {
  const all: UsuarioGestorListaItem[] = []
  const seen = new Set<string>()
  let offset = 0
  const limit = 100

  for (let page = 0; page < 500; page++) {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    })
    const res = await fetchGestorApi(`/api/pessoas/usuarios-gestor?${params.toString()}`, {
      headers: authHeaders(token),
    })
    if (!res.ok) break
    const data = (await res.json()) as {
      items?: unknown[]
      count?: number
      hasNext?: boolean
    }
    const items = data.items ?? []
    for (const raw of items) {
      const parsed = parseUsuarioGestorItem(raw)
      if (parsed && !seen.has(parsed.id)) {
        seen.add(parsed.id)
        all.push(parsed)
      }
    }
    if (items.length === 0) break
    if (items.length < limit) break
    if (data.hasNext === false) break
    offset += items.length
    if (typeof data.count === 'number' && offset >= data.count) break
  }

  return all
}

export function buildUsuariosPorEmailDeGestores(
  gestores: UsuarioGestorListaItem[]
): Record<string, UsuarioAceitoInfo> {
  const out: Record<string, UsuarioAceitoInfo> = {}
  for (const g of gestores) {
    const key = emailGestaoKey(g.username)
    if (!key) continue
    out[key] = { id: g.id, nome: g.nome }
  }
  return out
}

/**
 * Carrega convites, perfis e todos os usuários gestor (GET paginado).
 * A lista na UI aplica `filtrarConvitesParaLista` sobre `convitesTodos`.
 */
export async function carregarDadosCompletos(token: string): Promise<ConvitesGestaoData> {
  const [convitesTodos, perfisList, usuariosGestor] = await Promise.all([
    fetchConvitesList(token),
    fetchPerfis(token),
    fetchTodosUsuariosGestor(token).catch(() => [] as UsuarioGestorListaItem[]),
  ])

  return { convitesTodos, perfisList, usuariosGestor }
}

export async function criarConviteService(
  token: string,
  payload: { email: string; perfilGestorId: string }
): Promise<ConviteGestaoDTO> {
  const res = await fetchGestorApi('/api/convites', {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return (await res.json()) as ConviteGestaoDTO
}

export async function cancelarConviteService(token: string, id: string): Promise<void> {
  const res = await fetchGestorApi(`/api/convites/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseError(res))
  }
}

export async function reenviarConviteService(token: string, id: string): Promise<ConviteGestaoDTO> {
  const res = await fetchGestorApi(`/api/convites/${encodeURIComponent(id)}/reenviar`, {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await parseError(res))
  return (await res.json()) as ConviteGestaoDTO
}

export async function atualizarPerfilService(
  token: string,
  usuarioGestorId: string,
  novoPerfilGestorId: string
): Promise<void> {
  const res = await fetchGestorApi(`/api/pessoas/usuarios-gestor/${encodeURIComponent(usuarioGestorId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: authHeaders(token),
    body: JSON.stringify({ perfilGestorId: novoPerfilGestorId }),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function removerVinculoService(token: string, usuarioGestorId: string): Promise<void> {
  const res = await fetchGestorApi(`/api/pessoas/usuarios-gestor/${encodeURIComponent(usuarioGestorId)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseError(res))
  }
}
