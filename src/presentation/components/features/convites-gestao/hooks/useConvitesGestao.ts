'use client'

import { useCallback, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import type { ConviteGestaoDTO } from '@/src/application/dto/convites/ConvitesGestaoDTO'

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => null)
  if (data && typeof data === 'object' && data !== null && 'error' in data) {
    return String((data as { error?: unknown }).error)
  }
  return `Erro ${res.status}`
}

/** Resolve `role` de cada perfil gestor via GET /api/pessoas/perfis-gestor/[id]. */
async function buscarNomesPerfilGestor(
  token: string,
  perfilGestorIds: string[]
): Promise<Record<string, string>> {
  const unique = [
    ...new Set(perfilGestorIds.map(id => String(id).trim()).filter(Boolean)),
  ]
  const out: Record<string, string> = {}
  await Promise.all(
    unique.map(async id => {
      try {
        const res = await fetch(`/api/pessoas/perfis-gestor/${encodeURIComponent(id)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        if (!res.ok) {
          out[id] = '—'
          return
        }
        const data = (await res.json()) as { role?: unknown }
        const role = typeof data.role === 'string' ? data.role.trim() : ''
        out[id] = role.length > 0 ? role : '—'
      } catch {
        out[id] = '—'
      }
    })
  )
  return out
}

/**
 * Chamadas ao BFF de gestão de convites da empresa (token com contexto de empresa).
 */
export function useConvitesGestao() {
  const auth = useAuthStore(s => s.auth)

  const [convites, setConvites] = useState<ConviteGestaoDTO[]>([])
  const [perfilGestorNomePorId, setPerfilGestorNomePorId] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getToken = useCallback(() => auth?.getAccessToken() ?? null, [auth])

  const fetchConvites = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setError('Sessão sem token')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/convites', {
        method: 'GET',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        throw new Error(await parseError(res))
      }
      const data = (await res.json()) as ConviteGestaoDTO[]
      const arr = Array.isArray(data) ? data : []
      setConvites(arr)
      const ids = arr.map(c => c.perfilGestorId)
      setPerfilGestorNomePorId(await buscarNomesPerfilGestor(token, ids))
    } catch (e) {
      setConvites([])
      setPerfilGestorNomePorId({})
      setError(e instanceof Error ? e.message : 'Erro ao carregar convites')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  const criarConvite = useCallback(
    async (payload: { email: string; perfilGestorId: string }) => {
      const token = getToken()
      if (!token) {
        throw new Error('Sessão sem token')
      }
      const res = await fetch('/api/convites', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(await parseError(res))
      }
      const criado = (await res.json()) as ConviteGestaoDTO
      setConvites(prev => [criado, ...prev])
      const extras = await buscarNomesPerfilGestor(token, [criado.perfilGestorId])
      setPerfilGestorNomePorId(prev => ({ ...prev, ...extras }))
      return criado
    },
    [getToken]
  )

  const cancelarConvite = useCallback(
    async (id: string) => {
      const token = getToken()
      if (!token) {
        throw new Error('Sessão sem token')
      }
      const res = await fetch(`/api/convites/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok && res.status !== 204) {
        throw new Error(await parseError(res))
      }
      setConvites(prev => prev.filter(c => c.id !== id))
    },
    [getToken]
  )

  const reenviarConvite = useCallback(
    async (id: string) => {
      const token = getToken()
      if (!token) {
        throw new Error('Sessão sem token')
      }
      const res = await fetch(`/api/convites/${encodeURIComponent(id)}/reenviar`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        throw new Error(await parseError(res))
      }
      const atualizado = (await res.json()) as ConviteGestaoDTO
      setConvites(prev => prev.map(c => (c.id === atualizado.id ? atualizado : c)))
      return atualizado
    },
    [getToken]
  )

  return {
    convites,
    setConvites,
    perfilGestorNomePorId,
    loading,
    error,
    setError,
    fetchConvites,
    criarConvite,
    cancelarConvite,
    reenviarConvite,
  }
}
