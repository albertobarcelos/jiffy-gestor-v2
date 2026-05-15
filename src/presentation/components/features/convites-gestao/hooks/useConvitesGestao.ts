'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import type { ConviteGestaoDTO } from '@/src/application/dto/convites/ConvitesGestaoDTO'
import {
  carregarDadosCompletos,
  criarConviteService,
  cancelarConviteService,
  reenviarConviteService,
  atualizarPerfilService,
  removerVinculoService,
} from '../services/convitesGestaoService'

export type { PerfilGestorOption, UsuarioAceitoInfo } from '../services/convitesGestaoService'
import type { PerfilGestorOption, UsuarioAceitoInfo } from '../services/convitesGestaoService'

export function useConvitesGestao() {
  const auth = useAuthStore(s => s.auth)

  const [convites, setConvites] = useState<ConviteGestaoDTO[]>([])
  const [perfisList, setPerfisList] = useState<PerfilGestorOption[]>([])
  const [usuariosPorEmail, setUsuariosPorEmail] = useState<Record<string, UsuarioAceitoInfo>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyById, setBusyById] = useState<Record<string, 'cancelar' | 'reenviar' | null>>({})
  const didFetch = useRef(false)

  const getToken = useCallback(() => auth?.getAccessToken() ?? null, [auth])

  const setBusy = useCallback((id: string, action: 'cancelar' | 'reenviar' | null) => {
    setBusyById(prev => ({ ...prev, [id]: action }))
  }, [])

  const fetchAll = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await carregarDadosCompletos(token)
      setConvites(data.convites)
      setPerfisList(data.perfisList)
      setUsuariosPorEmail(data.usuariosPorEmail)
    } catch (e) {
      setConvites([])
      setPerfisList([])
      setUsuariosPorEmail({})
      setError(e instanceof Error ? e.message : 'Erro ao carregar convites')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return
    if (didFetch.current) return
    didFetch.current = true
    void fetchAll()
  }, [auth, fetchAll])

  const handleCriar = useCallback(
    async (payload: { email: string; perfilGestorId: string }) => {
      const token = getToken()
      if (!token) throw new Error('Sessão sem token')
      const criado = await criarConviteService(token, payload)
      setConvites(prev => [criado, ...prev])
      showToast.success('Convite criado.')
    },
    [getToken]
  )

  const handleCancelar = useCallback(
    async (id: string) => {
      const token = getToken()
      if (!token) return
      setBusy(id, 'cancelar')
      try {
        await cancelarConviteService(token, id)
        setConvites(prev => prev.filter(c => c.id !== id))
        showToast.success('Convite cancelado.')
      } catch (e) {
        showToast.error(e instanceof Error ? e.message : 'Erro ao cancelar')
      } finally {
        setBusy(id, null)
      }
    },
    [getToken, setBusy]
  )

  const handleReenviar = useCallback(
    async (id: string) => {
      const token = getToken()
      if (!token) return
      setBusy(id, 'reenviar')
      try {
        const atualizado = await reenviarConviteService(token, id)
        setConvites(prev => prev.map(c => (c.id === atualizado.id ? atualizado : c)))
        showToast.success('Convite reenviado.')
      } catch (e) {
        showToast.error(e instanceof Error ? e.message : 'Erro ao reenviar')
      } finally {
        setBusy(id, null)
      }
    },
    [getToken, setBusy]
  )

  const handlePerfilChange = useCallback(
    async (email: string, novoPerfilGestorId: string) => {
      const token = getToken()
      if (!token) return
      const info = usuariosPorEmail[email.toLowerCase().trim()]
      if (!info?.id) return
      try {
        await atualizarPerfilService(token, info.id, novoPerfilGestorId)
        setConvites(prev =>
          prev.map(c => {
            if (c.email.toLowerCase().trim() === email.toLowerCase().trim()) {
              return { ...c, perfilGestorId: novoPerfilGestorId }
            }
            return c
          })
        )
        showToast.success('Perfil atualizado.')
      } catch (e) {
        showToast.error(e instanceof Error ? e.message : 'Erro ao atualizar perfil')
      }
    },
    [getToken, usuariosPorEmail]
  )

  const handleRemoverVinculo = useCallback(
    async (email: string) => {
      const token = getToken()
      if (!token) return
      const emailKey = email.toLowerCase().trim()
      const info = usuariosPorEmail[emailKey]
      if (!info?.id) return
      setBusy(info.id, 'cancelar')
      try {
        await removerVinculoService(token, info.id)
        setConvites(prev => prev.filter(c => c.email.toLowerCase().trim() !== emailKey))
        setUsuariosPorEmail(prev => {
          const next = { ...prev }
          delete next[emailKey]
          return next
        })
        showToast.success('Vínculo removido com sucesso.')
      } catch (e) {
        showToast.error(e instanceof Error ? e.message : 'Erro ao remover vínculo')
      } finally {
        setBusy(info.id, null)
      }
    },
    [getToken, usuariosPorEmail, setBusy]
  )

  const perfilGestorNomePorId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of perfisList) map[p.id] = p.role
    return map
  }, [perfisList])

  const nomePorEmail = useMemo(() => {
    const map: Record<string, string> = {}
    for (const [email, info] of Object.entries(usuariosPorEmail)) {
      if (info.nome) map[email] = info.nome
    }
    return map
  }, [usuariosPorEmail])

  return {
    convites,
    perfisList,
    perfilGestorNomePorId,
    nomePorEmail,
    usuariosPorEmail,
    loading,
    error,
    busyById,
    handleCriar,
    handleCancelar,
    handleReenviar,
    handlePerfilChange,
    handleRemoverVinculo,
  }
}
