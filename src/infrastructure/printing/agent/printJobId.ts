import { generateUuid } from '@/src/shared/utils/generateUuid'
import type { VendaGestorTicket } from '@/src/shared/types/vendaGestorTickets'

function sanitizarParte(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export function ticketPrintKey(ticket: VendaGestorTicket): string {
  const fromId = ticket.ticketId?.trim() || ticket.impressoraId?.trim()
  if (fromId) return sanitizarParte(fromId)
  return sanitizarParte(ticket.tipoCupom)
}

export function buildPrintJobId(params: {
  vendaId: string
  tipoCupom: string
  ticketKey: string
  reimpressao?: boolean
}): string {
  const base = [
    'venda',
    sanitizarParte(params.vendaId) || 'sem-venda',
    sanitizarParte(params.tipoCupom) || 'cupom',
    sanitizarParte(params.ticketKey) || 'ticket',
  ].join('-')

  if (params.reimpressao) {
    return `${base}-reprint-${generateUuid()}`
  }
  return base
}
