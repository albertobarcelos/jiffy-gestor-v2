'use client'

import { useMemo } from 'react'
import type { TipoAtendimentoDelivery } from '../types'

interface UseNovoPedidoDeliveryParams {
  tipoInicioPedido: 'balcao' | 'entrega'
  tipoAtendimentoDelivery: TipoAtendimentoDelivery
}

export function useNovoPedidoDelivery({
  tipoInicioPedido,
  tipoAtendimentoDelivery,
}: UseNovoPedidoDeliveryParams) {
  return useMemo(() => {
    const pedidoDeliveryGestor = tipoInicioPedido === 'entrega'
    const pedidoComEntrega = pedidoDeliveryGestor && tipoAtendimentoDelivery === 'entrega'
    const pedidoComRetirada = pedidoDeliveryGestor && tipoAtendimentoDelivery === 'retirada'

    return {
      pedidoDeliveryGestor,
      pedidoComEntrega,
      pedidoComRetirada,
    }
  }, [tipoAtendimentoDelivery, tipoInicioPedido])
}
