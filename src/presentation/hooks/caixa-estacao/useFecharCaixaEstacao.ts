'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { mapPaginationOperacaoCaixaEstacao } from '@/src/application/mappers/caixa-estacao/OperacaoCaixaEstacaoMapper'
import { prepararFechamentoCaixaEstacao } from '@/src/application/use-cases/caixa-estacao/FecharCaixaEstacaoUseCase'
import type { FecharCaixaEstacaoInput } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import {
  fetchGestorApi,
  lerErroCaixaEstacao,
  pathFechamentoCaixaEstacao,
} from '@/src/presentation/hooks/caixa-estacao/caixaEstacaoApi'
import { caixaEstacaoCurrentQueryKey } from '@/src/presentation/hooks/caixa-estacao/caixaEstacaoCache'

export type FecharCaixaEstacaoResult = {
  operacaoCaixaId?: string
}

export function useFecharCaixaEstacao(estacaoGestorId: string | null) {
  const queryClient = useQueryClient()
  return useSecureTenantMutation(async ({ token, empresaId }, input: FecharCaixaEstacaoInput) => {
    const id = estacaoGestorId?.trim()
    if (!id) throw new Error('Estação deste computador não está vinculada.')
    const body = prepararFechamentoCaixaEstacao(input)
    const response = await fetchGestorApi(pathFechamentoCaixaEstacao(id), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(await lerErroCaixaEstacao(response))

    const payload = (await response.json().catch(() => ({}))) as FecharCaixaEstacaoResult
    const currentKey = caixaEstacaoCurrentQueryKey(empresaId, id)
    queryClient.setQueryData(currentKey, { aberta: false, operacao: null })
    await queryClient.invalidateQueries({ queryKey: currentKey })
    await queryClient.invalidateQueries({
      queryKey: ['tenant', empresaId, 'caixa-estacao', 'historico', id],
    })

    return payload
  })
}

export function useHistoricoCaixaEstacao(estacaoGestorId: string | null) {
  return useSecureTenantQuery(
    ['caixa-estacao', 'historico', estacaoGestorId],
    async ({ token }) => {
      const params = new URLSearchParams({
        limit: '20',
        offset: '0',
        status: 'fechado',
      })
      if (estacaoGestorId?.trim()) {
        params.set('estacaoGestorId', estacaoGestorId.trim())
      }
      const response = await fetchGestorApi(`/api/caixa/operacao-caixa-estacao?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(await lerErroCaixaEstacao(response))
      return mapPaginationOperacaoCaixaEstacao(await response.json())
    },
    { enabled: Boolean(estacaoGestorId), retry: false }
  )
}
