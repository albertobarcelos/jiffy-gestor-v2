'use client'

import { useMemo } from 'react'
import { deveUsarModuloDeliveryParaDetalhe } from '@/src/application/mappers/PedidoDeliveryDetalheAdapter'
import type { TipoAtendimentoDelivery } from '../types'

interface UseNovoPedidoDeliveryParams {
  tipoInicioPedido: 'balcao' | 'entrega'
  tipoAtendimentoDelivery: TipoAtendimentoDelivery
  tabelaOrigemVenda?: 'venda' | 'venda_gestor'
  /** Hint do Kanban ou meta carregada (`entrega`, `retirada`, `balcao`). */
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
      tipoInicioPedido === 'entrega' ||
      (tipoInicioPedido === 'balcao' &&
        Boolean(tipoVendaNormalizado) &&
        deveUsarModuloDeliveryParaDetalhe(tabelaOrigemVenda, tipoVendaHint))

    const pedidoComEntrega =
      pedidoDeliveryGestor &&
      (tipoAtendimentoDelivery === 'entrega' || tipoVendaNormalizado === 'entrega')
    const pedidoComRetirada =
      pedidoDeliveryGestor &&
      (tipoAtendimentoDelivery === 'retirada' || tipoVendaNormalizado === 'retirada')

    return {
      pedidoDeliveryGestor,
      pedidoComEntrega,
      pedidoComRetirada,
    }
  }, [tabelaOrigemVenda, tipoAtendimentoDelivery, tipoInicioPedido, tipoVendaHint])
}
