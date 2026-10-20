'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import type {
  CaixaEstacaoAtualDTO,
  MovimentacaoCaixaEstacaoInput,
} from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import type { SangriaCaixaEstacaoInput } from '@/src/application/use-cases/caixa-estacao/RegistrarMovimentacaoCaixaEstacaoUseCase'
import { OperacaoCaixaEstacaoApiRepository } from '@/src/infrastructure/api/repositories/OperacaoCaixaEstacaoApiRepository'
import {
  RegistrarSangriaCaixaEstacaoUseCase,
  RegistrarSuprimentoCaixaEstacaoUseCase,
} from '@/src/application/use-cases/caixa-estacao/RegistrarMovimentacaoCaixaEstacaoUseCase'
import {
  aplicarMovimentacaoCaixaEstacaoOptimista,
  caixaEstacaoCurrentQueryKey,
  type MovimentacaoCaixaEstacaoTipo,
} from '@/src/presentation/components/features/meu-caixa/hooks/caixaEstacaoCache'

type MovimentacaoOptimisticContext = {
  previous: CaixaEstacaoAtualDTO | undefined
  queryKey: ReturnType<typeof caixaEstacaoCurrentQueryKey>
}

function useRegistrarMovimentacaoCaixaEstacao<TInput extends MovimentacaoCaixaEstacaoInput>(
  estacaoGestorId: string | null,
  tipoCache: MovimentacaoCaixaEstacaoTipo,
  executar: (
    gateway: OperacaoCaixaEstacaoApiRepository,
    estacaoId: string,
    input: TInput
  ) => Promise<unknown>
) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation<unknown, TInput, MovimentacaoOptimisticContext | undefined>(
    async ({ token }, input) => {
      const id = estacaoGestorId?.trim()
      if (!id) throw new Error('Estação deste computador não está vinculada.')
      const gateway = new OperacaoCaixaEstacaoApiRepository(token)
      return executar(gateway, id, input)
    },
    {
      onMutate: async input => {
        const id = estacaoGestorId?.trim()
        if (!id || !empresaId) return undefined
        const queryKey = caixaEstacaoCurrentQueryKey(empresaId, id)
        await queryClient.cancelQueries({ queryKey })
        const previous = queryClient.getQueryData<CaixaEstacaoAtualDTO>(queryKey)
        queryClient.setQueryData(
          queryKey,
          aplicarMovimentacaoCaixaEstacaoOptimista(previous, tipoCache, input.valor, id)
        )
        return { previous, queryKey }
      },
      onError: (_error, _input, context) => {
        if (context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previous)
        }
      },
      onSettled: (_data, _error, _input, context) => {
        if (context?.queryKey) {
          void queryClient.invalidateQueries({ queryKey: context.queryKey })
        }
        if (empresaId) {
          void queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'caixa-estacao'] })
        }
      },
    }
  )
}

export function useRegistrarSangriaCaixaEstacao(estacaoGestorId: string | null) {
  return useRegistrarMovimentacaoCaixaEstacao<SangriaCaixaEstacaoInput>(
    estacaoGestorId,
    'sangria',
    (gateway, id, input) => new RegistrarSangriaCaixaEstacaoUseCase(gateway).execute(id, input)
  )
}

export function useRegistrarSuprimentoCaixaEstacao(estacaoGestorId: string | null) {
  return useRegistrarMovimentacaoCaixaEstacao<MovimentacaoCaixaEstacaoInput>(
    estacaoGestorId,
    'suprimento',
    (gateway, id, input) => new RegistrarSuprimentoCaixaEstacaoUseCase(gateway).execute(id, input)
  )
}
