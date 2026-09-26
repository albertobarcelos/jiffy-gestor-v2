'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { mapListaMovimentacoesCaixaEstacao } from '@/src/application/mappers/caixa-estacao/OperacaoCaixaEstacaoMapper'
import {
  prepararSangriaCaixaEstacao,
  prepararSuprimentoCaixaEstacao,
} from '@/src/application/use-cases/caixa-estacao/RegistrarMovimentacaoCaixaEstacaoUseCase'
import type {
  CaixaEstacaoAtualDTO,
  MovimentacaoCaixaEstacaoInput,
} from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import {
  fetchGestorApi,
  lerErroCaixaEstacao,
  pathMovimentacaoCaixaEstacao,
} from '@/src/presentation/hooks/caixa-estacao/caixaEstacaoApi'
import {
  aplicarMovimentacaoCaixaEstacaoOptimista,
  caixaEstacaoCurrentQueryKey,
  type MovimentacaoCaixaEstacaoTipo,
} from '@/src/presentation/hooks/caixa-estacao/caixaEstacaoCache'

type MovimentacaoOptimisticContext = {
  previous: CaixaEstacaoAtualDTO | undefined
  queryKey: ReturnType<typeof caixaEstacaoCurrentQueryKey>
}

type SangriaInput = MovimentacaoCaixaEstacaoInput & { saldoDisponivel: number }

function useRegistrarMovimentacaoCaixaEstacao<TInput extends MovimentacaoCaixaEstacaoInput>(
  estacaoGestorId: string | null,
  tipoApi: 'sangrias' | 'suprimentos',
  tipoCache: MovimentacaoCaixaEstacaoTipo,
  preparar: (input: TInput) => { valor: number; descricao: string }
) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation<unknown, TInput, MovimentacaoOptimisticContext>(
    async ({ token }, input) => {
      const id = estacaoGestorId?.trim()
      if (!id) throw new Error('Estação deste computador não está vinculada.')
      const body = preparar(input)
      const response = await fetchGestorApi(pathMovimentacaoCaixaEstacao(id, tipoApi), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(await lerErroCaixaEstacao(response))
      return response.json()
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

export function useSangriasCaixaEstacao(estacaoGestorId: string | null, enabled: boolean) {
  return useSecureTenantQuery(
    ['caixa-estacao', 'sangrias', estacaoGestorId],
    async ({ token }) => {
      const id = estacaoGestorId?.trim()
      if (!id) return []
      const response = await fetchGestorApi(pathMovimentacaoCaixaEstacao(id, 'sangrias'), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(await lerErroCaixaEstacao(response))
      return mapListaMovimentacoesCaixaEstacao(await response.json())
    },
    { enabled: enabled && Boolean(estacaoGestorId), retry: false }
  )
}

export function useSuprimentosCaixaEstacao(estacaoGestorId: string | null, enabled: boolean) {
  return useSecureTenantQuery(
    ['caixa-estacao', 'suprimentos', estacaoGestorId],
    async ({ token }) => {
      const id = estacaoGestorId?.trim()
      if (!id) return []
      const response = await fetchGestorApi(pathMovimentacaoCaixaEstacao(id, 'suprimentos'), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(await lerErroCaixaEstacao(response))
      return mapListaMovimentacoesCaixaEstacao(await response.json())
    },
    { enabled: enabled && Boolean(estacaoGestorId), retry: false }
  )
}

export function useRegistrarSangriaCaixaEstacao(estacaoGestorId: string | null) {
  return useRegistrarMovimentacaoCaixaEstacao<SangriaInput>(
    estacaoGestorId,
    'sangrias',
    'sangria',
    prepararSangriaCaixaEstacao
  )
}

export function useRegistrarSuprimentoCaixaEstacao(estacaoGestorId: string | null) {
  return useRegistrarMovimentacaoCaixaEstacao(
    estacaoGestorId,
    'suprimentos',
    'suprimento',
    prepararSuprimentoCaixaEstacao
  )
}
