import type { VendaGestorTicket } from '@/src/shared/types/vendaGestorTickets'

function sanitizarParte(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export function ticketPrintKey(ticket: VendaGestorTicket): string {
  const fromId = ticket.ticketId?.trim() || ticket.impressoraId?.trim()
  if (fromId) return sanitizarParte(fromId)
  return sanitizarParte(ticket.tipoCupom)
}
