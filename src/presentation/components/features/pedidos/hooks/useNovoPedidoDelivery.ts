'use client'

import { useMemo } from 'react'
import { deveUsarModuloDeliveryParaDetalhe } from '@/src/application/mappers/PedidoDeliveryDetalheAdapter'
import type { TipoAtendimentoDelivery } from '../types'

interface UseNovoPedidoDeliveryParams {
  tipoInicioPedido: 'balcao' | 'delivery'
  tipoAtendimentoDelivery: TipoAtendimentoDelivery
  tabelaOrigemVenda?: 'venda' | 'venda_gestor'
  /** Hint do Kanban (`delivery` vs balcão). */
  tipoVendaHint?: string | null
}

export function useNovoPedidoDelivery({
  tipoInicioPedido,
  tipoAtendimentoDelivery,
  tabelaOrigemVenda = 'venda_gestor',
  tipoVendaHint = null,
}: UseNovoPedidoDeliveryParams) {
  return useMemo(() => {
    const tipoVendaNormalizado = String(tipoVendaHint ?? '').trim().toLowerCase()
    /** Cliente/endereço obrigatórios só no fluxo de entrega; balcão novo não usa hint vazio como delivery. */
    const pedidoDeliveryGestor =
      tipoInicioPedido === 'delivery' ||
      (tipoInicioPedido === 'balcao' &&
        Boolean(tipoVendaNormalizado) &&
        deveUsarModuloDeliveryParaDetalhe(tabelaOrigemVenda, tipoVendaHint))

    const pedidoComEntrega = pedidoDeliveryGestor && tipoAtendimentoDelivery === 'entrega'
    const pedidoComRetirada = pedidoDeliveryGestor && tipoAtendimentoDelivery === 'retirada'

    return {
      pedidoDeliveryGestor,
      pedidoComEntrega,
      pedidoComRetirada,
    }
  }, [tabelaOrigemVenda, tipoAtendimentoDelivery, tipoInicioPedido, tipoVendaHint])
}
