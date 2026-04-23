'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { resolverTimezoneAgregacaoEmpresa } from '@/src/shared/utils/timezoneAgregacaoEmpresa'

/** Resumo da empresa da sessão (mesma rota usada em configurações / painel contador) */
export interface EmpresaMeResumo {
  id: string
  nomeExibicao: string
}

/**
 * Carrega a empresa vinculada ao token em uma única chamada: `GET /api/empresas/me`.
 * Evita o par auth/me + empresas/:id quando só precisamos do nome e do id para o tenant atual.
 */
export function useEmpresaMe() {
  const { auth, isAuthenticated, isRehydrated } = useAuthStore()
  const [empresa, setEmpresa] = useState<EmpresaMeResumo | null>(null)
  const [timezoneAgregacao, setTimezoneAgregacao] = useState('America/Sao_Paulo')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEmpresa = useCallback(async () => {
    if (!isRehydrated || !isAuthenticated || !auth) {
      setIsLoading(false)
      setEmpresa(null)
      setTimezoneAgregacao('America/Sao_Paulo')
      setError(null)
      return
    }

    const token = auth.getAccessToken()
    if (!token) {
      setIsLoading(false)
      setEmpresa(null)
      setTimezoneAgregacao('America/Sao_Paulo')
      setError('Sessão sem token')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/empresas/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(typeof body.error === 'string' ? body.error : `Erro ${res.status}`)
      }
      const data: Record<string, unknown> = await res.json()
      const id = data.id != null ? String(data.id) : ''
      if (!id) {
        throw new Error('Resposta sem id da empresa')
      }
      const candidatos = [data.nomeFantasia, data.razaoSocial, data.nome]
      const nomeBruto = candidatos.find(
        (v): v is string => typeof v === 'string' && v.trim().length > 0
      )
      const nomeExibicao = nomeBruto?.trim() ?? 'Empresa'

      const tzAgg = resolverTimezoneAgregacaoEmpresa(data)
      if (process.env.NODE_ENV === 'development') {
        console.log('[useEmpresaMe] GET /api/empresas/me — timezone agregação:', {
          parametroEmpresa: data.parametroEmpresa,
          timezoneResolvido: tzAgg,
        })
      }
      setTimezoneAgregacao(tzAgg)
      setEmpresa({ id, nomeExibicao })
    } catch (e) {
      setEmpresa(null)
      setTimezoneAgregacao('America/Sao_Paulo')
      setError(e instanceof Error ? e.message : 'Erro ao carregar empresa')
    } finally {
      setIsLoading(false)
    }
  }, [auth, isAuthenticated, isRehydrated])

  useEffect(() => {
    void fetchEmpresa()
  }, [fetchEmpresa])

  return { empresa, timezoneAgregacao, isLoading, error, refetch: fetchEmpresa }
}
