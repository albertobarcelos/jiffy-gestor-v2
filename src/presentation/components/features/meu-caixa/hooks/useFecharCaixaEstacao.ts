'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import type { FecharCaixaEstacaoInput } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import type { FecharCaixaEstacaoGatewayResult } from '@/src/application/ports/IOperacaoCaixaEstacaoGateway'
import { OperacaoCaixaEstacaoApiRepository } from '@/src/infrastructure/api/repositories/OperacaoCaixaEstacaoApiRepository'
import { FecharCaixaEstacaoUseCase } from '@/src/application/use-cases/caixa-estacao/FecharCaixaEstacaoUseCase'
import { ListarHistoricoCaixaEstacaoUseCase } from '@/src/application/use-cases/caixa-estacao/ListarHistoricoCaixaEstacaoUseCase'
import { caixaEstacaoCurrentQueryKey } from '@/src/presentation/components/features/meu-caixa/hooks/caixaEstacaoCache'

export type FecharCaixaEstacaoResult = FecharCaixaEstacaoGatewayResult

export function useFecharCaixaEstacao(estacaoGestorId: string | null) {
  const queryClient = useQueryClient()
  return useSecureTenantMutation(
    async ({ token, empresaId }, input: FecharCaixaEstacaoInput) => {
      const id = estacaoGestorId?.trim()
      if (!id) throw new Error('Estação deste computador não está vinculada.')
      const gateway = new OperacaoCaixaEstacaoApiRepository(token)
      const payload = await new FecharCaixaEstacaoUseCase(gateway).execute(id, input)
      const currentKey = caixaEstacaoCurrentQueryKey(empresaId, id)
      queryClient.setQueryData(currentKey, { aberta: false, operacao: null })
      await queryClient.invalidateQueries({ queryKey: currentKey })
      await queryClient.invalidateQueries({
        queryKey: ['tenant', empresaId, 'caixa-estacao', 'historico', id],
      })
      return payload
    }
  )
}

export function useHistoricoCaixaEstacao(estacaoGestorId: string | null) {
  return useSecureTenantQuery(
    ['caixa-estacao', 'historico', estacaoGestorId],
    async ({ token }) => {
      const id = estacaoGestorId?.trim()
      if (!id) {
        return {
          count: 0,
          limit: 20,
          offset: 0,
          page: 1,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
          items: [],
        }
      }
      const gateway = new OperacaoCaixaEstacaoApiRepository(token)
      return new ListarHistoricoCaixaEstacaoUseCase(gateway).execute(id)
    },
    { enabled: Boolean(estacaoGestorId?.trim()), retry: false }
  )
}
