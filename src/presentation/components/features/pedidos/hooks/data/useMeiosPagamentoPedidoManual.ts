'use client'

import { useEffect, useMemo } from 'react'
import {
  coletarMeiosDasPaginas,
  unirMeiosPedidoManual,
} from '@/src/application/meios-pagamentos/resolverFiltroMeiosPagamentoNovoPedido'
import type { TipoAtendimentoDelivery } from '@/src/domain/types/vendaDetalhe'
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
 * Meios do pedido manual.
 * Delivery: só o canal do tipo (entrega ou retirada).
 * Balcão / sem tipo: união dos dois canais (sem `ativoDelivery` legado).
 */
export function useMeiosPagamentoPedidoManual(
  enabled: boolean,
  tipoAtendimento?: TipoAtendimentoDelivery | null
) {
  const soEntrega = tipoAtendimento === 'entrega'
  const soRetirada = tipoAtendimento === 'retirada'
  const buscarAmbos = !soEntrega && !soRetirada

  const entregaEnabled = enabled && (buscarAmbos || soEntrega)
  const retiradaEnabled = enabled && (buscarAmbos || soRetirada)

  const entrega = useMeiosPagamentoInfinite({
    limit: 100,
    ativoEntregaDelivery: true,
    enabled: entregaEnabled,
    refetchOnWindowFocus: false,
  })
  const retirada = useMeiosPagamentoInfinite({
    limit: 100,
    ativoRetiradaDelivery: true,
    enabled: retiradaEnabled,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    esgotarPaginas({
      enabled: entregaEnabled,
      hasNextPage: Boolean(entrega.hasNextPage),
      isFetchingNextPage: entrega.isFetchingNextPage,
      fetchNextPage: entrega.fetchNextPage,
    })
  }, [entregaEnabled, entrega.hasNextPage, entrega.isFetchingNextPage, entrega.fetchNextPage])

  useEffect(() => {
    esgotarPaginas({
      enabled: retiradaEnabled,
      hasNextPage: Boolean(retirada.hasNextPage),
      isFetchingNextPage: retirada.isFetchingNextPage,
      fetchNextPage: retirada.fetchNextPage,
    })
  }, [retiradaEnabled, retirada.hasNextPage, retirada.isFetchingNextPage, retirada.fetchNextPage])

  const meiosPagamento = useMemo(
    () =>
      ordenarMeiosPagamentoPadrao(
        unirMeiosPedidoManual(
          [
            entregaEnabled ? coletarMeiosDasPaginas(entrega.data?.pages) : [],
            retiradaEnabled ? coletarMeiosDasPaginas(retirada.data?.pages) : [],
          ],
          tipoAtendimento
        )
      ),
    [entrega.data, retirada.data, entregaEnabled, retiradaEnabled, tipoAtendimento]
  )

  return {
    meiosPagamento,
    isPending:
      (entregaEnabled && entrega.isPending) || (retiradaEnabled && retirada.isPending),
    isFetching:
      (entregaEnabled && entrega.isFetching) || (retiradaEnabled && retirada.isFetching),
  }
}
