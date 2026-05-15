import type { ConviteGestaoDTO } from '@/src/application/dto/convites/ConvitesGestaoDTO'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

export type PerfilGestorOption = { id: string; role: string }

export type UsuarioAceitoInfo = { id: string; nome: string }

export interface ConvitesGestaoData {
  convites: ConviteGestaoDTO[]
  perfisList: PerfilGestorOption[]
  usuariosPorEmail: Record<string, UsuarioAceitoInfo>
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

async function fetchUsuariosAceitos(
  token: string,
  emails: string[]
): Promise<Record<string, UsuarioAceitoInfo>> {
  const unique = [...new Set(emails.map(e => e.toLowerCase().trim()).filter(Boolean))]
  if (unique.length === 0) return {}

  const out: Record<string, UsuarioAceitoInfo> = {}

  await Promise.all(
    unique.map(async email => {
      try {
        const params = new URLSearchParams({ q: email, limit: '5', offset: '0' })
        const res = await fetchGestorApi(`/api/pessoas/usuarios-gestor?${params.toString()}`, {
          headers: authHeaders(token),
        })
        if (!res.ok) return
        const data = (await res.json()) as { items?: Array<{ id?: string; nome?: string; username?: string }> }
        const items = data.items ?? []
        const match = items.find(u => u.username?.toLowerCase().trim() === email)
        if (match?.id) {
          const nome = (match.nome && match.nome.trim() && match.nome.trim().toUpperCase() !== 'SEM NOME')
            ? match.nome.trim()
            : ''
          out[email] = { id: match.id, nome }
        }
      } catch {
        /* silencia erro de lookup individual */
      }
    })
  )

  return out
}

/**
 * Carrega todos os dados necessários em paralelo otimizado:
 * - Convites + Perfis em paralelo (não dependem um do outro)
 * - Depois busca usuários aceitos (depende da lista de convites)
 */
export async function carregarDadosCompletos(token: string): Promise<ConvitesGestaoData> {
  const [convites, perfisList] = await Promise.all([
    fetchConvitesList(token),
    fetchPerfis(token),
  ])

  const emailsAceitos = convites
    .filter(c => c.status.toUpperCase() === 'ACEITO')
    .map(c => c.email)

  const usuariosPorEmail = await fetchUsuariosAceitos(token, emailsAceitos)

  return { convites, perfisList, usuariosPorEmail }
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
