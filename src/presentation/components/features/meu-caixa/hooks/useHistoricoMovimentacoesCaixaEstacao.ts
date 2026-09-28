'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import type { MovimentacaoCaixaEstacaoDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import { OperacaoCaixaEstacaoApiRepository } from '@/src/infrastructure/api/repositories/OperacaoCaixaEstacaoApiRepository'
import {
  ListarMovimentacoesCaixaEstacaoUseCase,
  type TipoMovimentacaoCaixaEstacaoLista,
} from '@/src/application/use-cases/caixa-estacao/ListarMovimentacoesCaixaEstacaoUseCase'

export function useHistoricoMovimentacoesCaixaEstacao(
  estacaoGestorId: string | null,
  tipo: TipoMovimentacaoCaixaEstacaoLista,
  enabled = true
) {
  return useSecureTenantQuery<MovimentacaoCaixaEstacaoDTO[]>(
    ['caixa-estacao', 'movimentacoes', tipo, estacaoGestorId],
    async ({ token }) => {
      const id = estacaoGestorId?.trim()
      if (!id) return []
      const gateway = new OperacaoCaixaEstacaoApiRepository(token)
      return new ListarMovimentacoesCaixaEstacaoUseCase(gateway).execute(id, tipo)
    },
    {
      enabled: enabled && Boolean(estacaoGestorId?.trim()),
      retry: false,
      staleTime: 0,
    }
  )
}
