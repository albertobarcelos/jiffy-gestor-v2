'use client'

import { useEffect, useMemo } from 'react'
import {
  coletarMeiosDasPaginas,
  unirMeiosPedidoManual,
} from '@/src/application/meios-pagamentos/resolverFiltroMeiosPagamentoNovoPedido'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'
import { ordenarMeiosPagamentoPadrao } from '@/src/shared/utils/corFormaPagamentoFiscal'

function esgotarPaginas(query: {
  enabled: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => Promise<unknown>
}) {
  if (!query.enabled || !query.hasNextPage || query.isFetchingNextPage) return
  void query.fetchNextPage()
}

/**
 * Meios do pedido manual: entrega OU retirada.
 * Busca os dois canais, esgota as páginas e une por id — não perde meio na página 2.
 */
export function useMeiosPagamentoPedidoManual(enabled: boolean) {
  const entrega = useMeiosPagamentoInfinite({
    limit: 100,
    ativoEntregaDelivery: true,
    ativoDelivery: true,
    enabled,
    refetchOnWindowFocus: false,
  })
  const retirada = useMeiosPagamentoInfinite({
    limit: 100,
    ativoRetiradaDelivery: true,
    ativoDelivery: true,
    enabled,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    esgotarPaginas({
      enabled,
      hasNextPage: Boolean(entrega.hasNextPage),
      isFetchingNextPage: entrega.isFetchingNextPage,
      fetchNextPage: entrega.fetchNextPage,
    })
  }, [enabled, entrega.hasNextPage, entrega.isFetchingNextPage, entrega.fetchNextPage])

  useEffect(() => {
    esgotarPaginas({
      enabled,
      hasNextPage: Boolean(retirada.hasNextPage),
      isFetchingNextPage: retirada.isFetchingNextPage,
      fetchNextPage: retirada.fetchNextPage,
    })
  }, [enabled, retirada.hasNextPage, retirada.isFetchingNextPage, retirada.fetchNextPage])

  const meiosPagamento = useMemo(
    () =>
      ordenarMeiosPagamentoPadrao(
        unirMeiosPedidoManual(
          coletarMeiosDasPaginas(entrega.data?.pages),
          coletarMeiosDasPaginas(retirada.data?.pages)
        )
      ),
    [entrega.data, retirada.data]
  )

  return {
    meiosPagamento,
    isPending: entrega.isPending || retirada.isPending,
    isFetching: entrega.isFetching || retirada.isFetching,
  }
}
