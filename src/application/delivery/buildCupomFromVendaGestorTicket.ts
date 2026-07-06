import type {
  VendaGestorTicket,
  VendaGestorTicketsResponse,
} from '@/src/shared/types/vendaGestorTickets'
import { renderDeliveryCupomHtml } from '@/src/application/delivery/renderDeliveryCupomHtml'
import type { DeliveryCupomTemplateConfig } from '@/src/shared/types/deliveryCupomTemplate'

export interface BuildCupomFromTicketOptions {
  nomeEmpresa?: string
  template?: DeliveryCupomTemplateConfig
  /** Mantido para compatibilidade com chamadas antigas. A largura agora vem de `template.larguraMm`. */
  larguraPx?: number
}

/**
 * HTML para um ticket já agrupado pelo backend (`GET .../tickets`).
 */
export function buildCupomFromVendaGestorTicket(
  root: VendaGestorTicketsResponse,
  ticket: VendaGestorTicket,
  options?: BuildCupomFromTicketOptions
): string {
  return renderDeliveryCupomHtml({
    root,
    ticket,
    nomeEmpresa: options?.nomeEmpresa,
    template: options?.template,
  })
}
