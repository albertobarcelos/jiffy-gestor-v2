'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import type { OperacaoCaixaEstacaoDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import { OperacaoCaixaEstacaoApiRepository } from '@/src/infrastructure/api/repositories/OperacaoCaixaEstacaoApiRepository'
import { BuscarOperacaoCaixaEstacaoPorIdUseCase } from '@/src/application/use-cases/caixa-estacao/BuscarOperacaoCaixaEstacaoPorIdUseCase'

export function useOperacaoCaixaEstacaoPorId(
  operacaoCaixaId: string | null,
  enabled = true
) {
  const id = operacaoCaixaId?.trim() || null

  return useSecureTenantQuery<OperacaoCaixaEstacaoDTO | null>(
    ['caixa-estacao', 'operacao', id],
    async ({ token }) => {
      if (!id) return null
      const gateway = new OperacaoCaixaEstacaoApiRepository(token)
      const useCase = new BuscarOperacaoCaixaEstacaoPorIdUseCase(gateway)
      return useCase.execute(id)
    },
    {
      enabled: enabled && Boolean(id),
      retry: false,
    }
  )
}
