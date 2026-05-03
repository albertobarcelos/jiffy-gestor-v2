import type { TipoCupomDelivery } from '@/src/shared/types/deliveryImpressao'
import type { TicketTipoCupomApi, VendaGestorTicket } from '@/src/shared/types/vendaGestorTickets'
import { logImpressao } from '@/src/shared/utils/logImpressaoDelivery'

const DECISAO_PARA_API: Record<TipoCupomDelivery, TicketTipoCupomApi> = {
  producao_completa: 'unificado',
  producao_cozinha: 'producao',
  expedicao: 'expedicao',
}

/** Alinha `TipoCupomDelivery` (UI/decidir) com `tipoCupom` retornado pelo GET `/tickets`. */
export function filtrarTicketsPorTipoDecidido(
  tickets: VendaGestorTicket[],
  tipoDecidido: TipoCupomDelivery
): VendaGestorTicket[] {
  const want = DECISAO_PARA_API[tipoDecidido]
  const filtrados = tickets.filter(t => t.tipoCupom === want)
  logImpressao('filtrarTickets.porTipo', {
    tipoDecidido,
    tipoCupomApiEsperado: want,
    ticketsDisponiveis: tickets.map(t => t.tipoCupom),
    quantidadeFiltrada: filtrados.length,
  })
  return filtrados
}
