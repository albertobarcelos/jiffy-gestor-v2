import {
  buscarMapeamentosEstacao,
  resolverEstacaoImpressaoConfig,
} from '@/src/infrastructure/api/estacoesImpressaoApi'
import { getEstacaoImpressaoId } from '@/src/infrastructure/printing/estacaoImpressaoStorage'
import { isTcpPrinterRef } from '@/src/infrastructure/printing/tcpPrinterRef'
import type { VendaGestorTicket } from '@/src/shared/types/vendaGestorTickets'

/**
 * Resolve destino do ticket (nome Windows ou `tcp://IP:PORTA`) a partir do
 * mapeamento da estação. A impressão delivery envia esse nome ao agente.
 */
export async function resolvePrinterDestinationForTicket(
  ticket: VendaGestorTicket,
  token: string | undefined
): Promise<string | null> {
  const fromTicket =
    ticket.impressora?.nomeImpressoraWindows?.trim() ||
    ticket.nomeImpressoraWindows?.trim() ||
    null

  if (fromTicket) return fromTicket

  const impressoraId = ticket.impressoraId?.trim()
  if (!impressoraId || !token?.trim()) return null

  const estacaoId = getEstacaoImpressaoId()
  if (estacaoId) {
    try {
      const mapeamentos = await buscarMapeamentosEstacao(token, estacaoId)
      const hit = mapeamentos.find(m => m.impressoraId === impressoraId)
      const nome = hit?.nomeImpressoraWindows?.trim()
      if (nome) return nome
    } catch {
      /* tenta resolver estação abaixo */
    }
  }

  try {
    const config = await resolverEstacaoImpressaoConfig(token)
    const hit = config.mapeamentos.find(m => m.impressoraId === impressoraId)
    return hit?.nomeImpressoraWindows?.trim() || null
  } catch {
    return null
  }
}

export function destinoImpressoraResumo(nome: string): string {
  return isTcpPrinterRef(nome) ? nome : nome.slice(0, 60)
}

/** Impressoras virtuais do Windows que geram PDF/arquivo — não servem para cupom térmico. */
export function isImpressoraVirtualPdf(nome: string): boolean {
  const n = nome.trim().toLowerCase()
  if (!n) return false
  return (
    n.includes('print to pdf') ||
    n.includes('microsoft print to pdf') ||
    n.includes('salvar como pdf') ||
    n.includes('save as pdf') ||
    n === 'pdf' ||
    n.endsWith(' pdf')
  )
}
