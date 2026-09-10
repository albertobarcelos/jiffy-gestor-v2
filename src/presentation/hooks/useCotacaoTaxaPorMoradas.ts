'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import type { ProdutoSelecionado } from '@/src/domain/types/pedido'
import type { ResultadoCotacaoTaxaMorada } from '@/src/application/dto/api/cotacaoPedidoDeliveryApi'
import {
  chaveItensCotacaoDelivery,
  mapProdutosParaCotacaoDelivery,
} from '@/src/application/mappers/CotacaoPedidoDeliveryMapper'

const BFF = '/api/delivery/cotacao'
const DEBOUNCE_MS = 400

export type ResultadoCotacaoTaxaUi =
  | { status: 'idle' }
  | { status: 'loading' }
  | ResultadoCotacaoTaxaMorada

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function useCotacaoTaxaPorMoradas(params: {
  enabled: boolean
  telefone: string
  enderecoId: string
  produtos: ProdutoSelecionado[]
}): ResultadoCotacaoTaxaUi {
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

  const query = useSecureTenantQuery<ResultadoCotacaoTaxaMorada>(
    ['delivery', 'cotacao-taxa', enderecoId, telefone, chaveDebounced],
    async ({ token }) => {
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
    },
    {
      enabled: podeCotar && chaveDebounced === chaveItens,
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
      retry: 0,
    }
  )

  return useMemo((): ResultadoCotacaoTaxaUi => {
    if (!podeCotar) return { status: 'idle' }
    if (chaveDebounced !== chaveItens || query.isFetching || query.isPending) {
      return { status: 'loading' }
    }
    if (query.data) return query.data
    if (query.error) return { status: 'erro', message: query.error.message }
    return { status: 'loading' }
  }, [
    podeCotar,
    chaveDebounced,
    chaveItens,
    query.isFetching,
    query.isPending,
    query.data,
    query.error,
  ])
}
