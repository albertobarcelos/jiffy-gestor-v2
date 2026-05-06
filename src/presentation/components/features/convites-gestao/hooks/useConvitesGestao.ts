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

/**
 * Chamadas ao BFF de gestão de convites da empresa (token com contexto de empresa).
 */
export function useConvitesGestao() {
  const auth = useAuthStore(s => s.auth)

  const [convites, setConvites] = useState<ConviteGestaoDTO[]>([])
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
      setConvites(Array.isArray(data) ? data : [])
    } catch (e) {
      setConvites([])
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
    loading,
    error,
    setError,
    fetchConvites,
    criarConvite,
    cancelarConvite,
    reenviarConvite,
  }
}
