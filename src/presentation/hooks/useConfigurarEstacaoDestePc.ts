'use client'

import { useCallback, useEffect, useState } from 'react'
import type { EstacaoImpressaoResumo } from '@/src/domain/estacao-impressao/EstacaoImpressao'
import {
  criarEstacaoDestePcUseCases,
  vincularEstacaoDestePcUseCase,
} from '@/src/presentation/hooks/estacao-impressao/criarEstacaoDestePcUseCases'
import {
  useEstacaoImpressaoDestePc,
  useEstacoesImpressao,
  useInvalidateEstacaoImpressaoQueries,
} from '@/src/presentation/hooks/useEstacaoImpressaoQueries'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'

export function useConfigurarEstacaoDestePc(open: boolean) {
  const estacoesQuery = useEstacoesImpressao(open)
  const estacaoImpressaoQuery = useEstacaoImpressaoDestePc(open)
  const invalidateEstacaoQueries = useInvalidateEstacaoImpressaoQueries()

  const [estacaoIdLocal, setEstacaoIdLocal] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const estacoes = estacoesQuery.data ?? []
  const estacaoId = estacaoIdLocal || estacaoImpressaoQuery.data?.estacaoId?.trim() || ''

  useEffect(() => {
    if (!open) {
      setEstacaoIdLocal('')
      return
    }
    const id = estacaoImpressaoQuery.data?.estacaoId?.trim() ?? ''
    if (id) setEstacaoIdLocal(id)
  }, [open, estacaoImpressaoQuery.data?.estacaoId])

  const selecionar = useCallback(
    (id: string) => {
      const next = id.trim()
      const nome = estacoes.find(e => e.id === next)?.nome
      setEstacaoIdLocal(next)
      vincularEstacaoDestePcUseCase().execute(next, nome)
      invalidateEstacaoQueries()
    },
    [estacoes, invalidateEstacaoQueries]
  )

  const criar = useCallback(
    async (nome: string): Promise<EstacaoImpressaoResumo | undefined> => {
      const accessToken = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!accessToken) {
        showToast.error('Sessão expirada.')
        return
      }
      setOcupado(true)
      try {
        const criada = await criarEstacaoDestePcUseCases(accessToken).criar.execute(nome)
        setEstacaoIdLocal(criada.id)
        invalidateEstacaoQueries()
        showToast.success('Estação criada neste computador.')
        return criada
      } catch (error) {
        showToast.error(
          error instanceof Error ? error.message : 'Não foi possível criar a estação.'
        )
        throw error
      } finally {
        setOcupado(false)
      }
    },
    [invalidateEstacaoQueries]
  )

  const renomear = useCallback(
    async (nome: string) => {
      const accessToken = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!accessToken) {
        showToast.error('Sessão expirada.')
        return
      }
      setOcupado(true)
      try {
        await criarEstacaoDestePcUseCases(accessToken).renomear.execute(estacaoId, nome)
        invalidateEstacaoQueries()
        showToast.success('Estação renomeada.')
      } catch (error) {
        showToast.error(
          error instanceof Error ? error.message : 'Não foi possível renomear a estação.'
        )
        throw error
      } finally {
        setOcupado(false)
      }
    },
    [estacaoId, invalidateEstacaoQueries]
  )

  return {
    estacoes,
    estacaoId,
    ocupado,
    carregando: open && (estacoesQuery.isPending || estacaoImpressaoQuery.isPending),
    selecionar,
    criar,
    renomear,
  }
}
