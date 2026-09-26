'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { interpretarCaixaEstacaoAtual } from '@/src/application/use-cases/caixa-estacao/BuscarCaixaEstacaoAtualUseCase'
import type { CaixaEstacaoAtualDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import {
  fetchGestorApi,
  lerErroCaixaEstacao,
  pathCaixaEstacaoAtual,
} from '@/src/presentation/hooks/caixa-estacao/caixaEstacaoApi'

export function useCaixaEstacaoAtual(estacaoGestorId: string | null) {
  return useSecureTenantQuery<CaixaEstacaoAtualDTO>(
    ['caixa-estacao', 'current', estacaoGestorId],
    async ({ token }) => {
      const id = estacaoGestorId?.trim()
      if (!id) return { aberta: false, operacao: null }
      const response = await fetchGestorApi(pathCaixaEstacaoAtual(id), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.status === 404) {
        return interpretarCaixaEstacaoAtual(404, await response.json().catch(() => null))
      }
      if (!response.ok) {
        throw new Error(await lerErroCaixaEstacao(response))
      }
      return interpretarCaixaEstacaoAtual(response.status, await response.json())
    },
    {
      enabled: Boolean(estacaoGestorId?.trim()),
      retry: false,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    }
  )
}
