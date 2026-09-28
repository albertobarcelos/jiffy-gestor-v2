'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import type { CaixaEstacaoAtualDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import { OperacaoCaixaEstacaoApiRepository } from '@/src/infrastructure/api/repositories/OperacaoCaixaEstacaoApiRepository'
import { BuscarCaixaEstacaoAtualUseCase } from '@/src/application/use-cases/caixa-estacao/BuscarCaixaEstacaoAtualUseCase'

export function useCaixaEstacaoAtual(estacaoGestorId: string | null) {
  return useSecureTenantQuery<CaixaEstacaoAtualDTO>(
    ['caixa-estacao', 'current', estacaoGestorId],
    async ({ token }) => {
      const id = estacaoGestorId?.trim()
      if (!id) return { aberta: false, operacao: null }
      const gateway = new OperacaoCaixaEstacaoApiRepository(token)
      const useCase = new BuscarCaixaEstacaoAtualUseCase(gateway)
      return useCase.execute(id)
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
