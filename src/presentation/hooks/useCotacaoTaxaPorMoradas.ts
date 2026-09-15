'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import type { ProdutoSelecionado } from '@/src/domain/types/pedido'
import type { ResultadoCotacaoTaxaMorada } from '@/src/application/dto/api/cotacaoPedidoDeliveryApi'
import {
  chaveItensCotacaoDelivery,
  mapProdutosParaCotacaoDelivery,
} from '@/src/application/mappers/CotacaoPedidoDeliveryMapper'
import {
  resolverResultadoCotacaoTaxaUi,
  type ResultadoCotacaoTaxaUi,
} from '@/src/domain/policies/pedido/cotacaoEntregaPolicy'

const BFF = '/api/delivery/cotacao'
const DEBOUNCE_MS = 400
const COTACAO_STALE_MS = 1000 * 60 * 5
const COTACAO_TIMEOUT_MS = 20_000

export type { ResultadoCotacaoTaxaUi }

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export type CotacaoTaxaPorMoradasResultado = ResultadoCotacaoTaxaUi & {
  refetch: () => Promise<unknown>
  recotar: () => Promise<unknown>
  isFetching: boolean
}

export function useCotacaoTaxaPorMoradas(params: {
  enabled: boolean
  telefone: string
  enderecoId: string
  produtos: ProdutoSelecionado[]
}): CotacaoTaxaPorMoradasResultado {
  const produtosCotacao = useMemo(
    () => mapProdutosParaCotacaoDelivery(params.produtos),
    [params.produtos]
  )
  const telefone = onlyDigits(params.telefone)
  const enderecoId = params.enderecoId.trim()
  const chaveItens = useMemo(() => chaveItensCotacaoDelivery(produtosCotacao), [produtosCotacao])

  const [chaveDebounced, setChaveDebounced] = useState(chaveItens)
  useEffect(() => {
    const t = window.setTimeout(() => setChaveDebounced(chaveItens), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [chaveItens])

  const podeCotar =
    params.enabled && telefone.length >= 8 && Boolean(enderecoId) && produtosCotacao.length > 0

  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  const query = useSecureTenantQuery<ResultadoCotacaoTaxaMorada>(
    ['delivery', 'cotacao-taxa', enderecoId, telefone, chaveDebounced],
    async ({ token }) => {
      try {
        const res = await fetchGestorApi(BFF, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tipoEntrega: 'entrega',
            cliente: { telefone, enderecoIdEntrega: enderecoId },
            produtos: produtosCotacao,
          }),
          signal: AbortSignal.timeout(COTACAO_TIMEOUT_MS),
        })
        const raw: unknown = await res.json().catch(() => ({}))
        if (raw && typeof raw === 'object' && 'status' in raw) {
          const status = (raw as { status?: unknown }).status
          if (status === 'ok' || status === 'fora' || status === 'erro') {
            return raw as ResultadoCotacaoTaxaMorada
          }
        }
        const rawObj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
        const message =
          textoErroCorpoApi(raw) ||
          (typeof rawObj.error === 'string' ? rawObj.error : '') ||
          (typeof rawObj.message === 'string' ? rawObj.message : '') ||
          `Erro HTTP ${res.status}`
        return { status: 'erro', message }
      } catch (error) {
        const nome = error instanceof Error ? error.name : ''
        if (nome === 'TimeoutError' || nome === 'AbortError') {
          return {
            status: 'erro',
            message: 'A cotação da taxa demorou demais. Escolha outra taxa ou tente de novo.',
          }
        }
        throw error
      }
    },
    {
      enabled: podeCotar && chaveDebounced === chaveItens,
      staleTime: COTACAO_STALE_MS,
      gcTime: COTACAO_STALE_MS,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 0,
    }
  )

  const recotar = useCallback(() => {
    if (!empresaId) return Promise.resolve()
    return queryClient.resetQueries({
      queryKey: ['tenant', empresaId, 'delivery', 'cotacao-taxa'],
    })
  }, [queryClient, empresaId])

  return useMemo(
    (): CotacaoTaxaPorMoradasResultado => ({
      ...resolverResultadoCotacaoTaxaUi({
        podeCotar,
        chaveItensAtual: chaveItens,
        chaveItensDebounced: chaveDebounced,
        data: query.data,
        errorMessage: query.error?.message,
        isFetching: query.isFetching,
      }),
      refetch: () => query.refetch(),
      recotar,
      isFetching: query.isFetching,
    }),
    [
      podeCotar,
      chaveDebounced,
      chaveItens,
      query.data,
      query.error,
      query.refetch,
      query.isFetching,
      recotar,
    ]
  )
}
