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
 * Balcão: Terminal ativo (`ativo=true`).
 * Delivery: só o canal do tipo (entrega ou retirada), sem legado `ativoDelivery`.
 */
export function useMeiosPagamentoPedidoManual(
  enabled: boolean,
  tipoAtendimento?: TipoAtendimentoDelivery | null
) {
  const soEntrega = tipoAtendimento === 'entrega'
  const soRetirada = tipoAtendimento === 'retirada'
  const isBalcao = !soEntrega && !soRetirada

  const terminalEnabled = enabled && isBalcao
  const entregaEnabled = enabled && soEntrega
  const retiradaEnabled = enabled && soRetirada

  const terminal = useMeiosPagamentoInfinite({
    limit: 100,
    ativo: true,
    enabled: terminalEnabled,
    refetchOnWindowFocus: false,
  })
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
      enabled: terminalEnabled,
      hasNextPage: Boolean(terminal.hasNextPage),
      isFetchingNextPage: terminal.isFetchingNextPage,
      fetchNextPage: terminal.fetchNextPage,
    })
  }, [terminalEnabled, terminal.hasNextPage, terminal.isFetchingNextPage, terminal.fetchNextPage])

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

  const meiosPagamento = useMemo(() => {
    const listas: ReturnType<typeof coletarMeiosDasPaginas>[] = []
    if (terminalEnabled) listas.push(coletarMeiosDasPaginas(terminal.data?.pages))
    if (entregaEnabled) listas.push(coletarMeiosDasPaginas(entrega.data?.pages))
    if (retiradaEnabled) listas.push(coletarMeiosDasPaginas(retirada.data?.pages))

    return ordenarMeiosPagamentoPadrao(unirMeiosPedidoManual(listas, tipoAtendimento))
  }, [
    terminal.data,
    entrega.data,
    retirada.data,
    terminalEnabled,
    entregaEnabled,
    retiradaEnabled,
    tipoAtendimento,
  ])

  return {
    meiosPagamento,
    isPending:
      (terminalEnabled && terminal.isPending) ||
      (entregaEnabled && entrega.isPending) ||
      (retiradaEnabled && retirada.isPending),
    isFetching:
      (terminalEnabled && terminal.isFetching) ||
      (entregaEnabled && entrega.isFetching) ||
      (retiradaEnabled && retirada.isFetching),
  }
}
