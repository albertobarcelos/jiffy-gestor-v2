import {
  buscarMapeamentosEstacao,
  resolverEstacaoImpressaoConfig,
} from '@/src/infrastructure/api/estacoesImpressaoApi'
import { getEstacaoImpressaoId } from '@/src/infrastructure/printing/estacaoImpressaoStorage'
import { isTcpPrinterRef } from '@/src/infrastructure/printing/qzTrayClient'
import type { VendaGestorTicket } from '@/src/shared/types/vendaGestorTickets'

/**
 * Resolve o destino de impressão do ticket (Windows ou `tcp://IP:PORTA`).
 * Prioriza o valor já montado no ticket; se ausente, busca mapeamento da estação local.
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

export function mensagemDestinoImpressoraAusente(ticket: VendaGestorTicket): string {
  const destino = ticket.impressoraNome?.trim() || ticket.impressoraId || ticket.tipoCupom
  return `Ticket "${destino}": configure a impressora (Windows ou IP) em Configurações → Impressoras e salve.`
}

export function mensagemFalhaQzTray(params: {
  destino: string
  tcp: boolean
  detalhe?: string
}): string {
  if (params.tcp) {
    return `Não foi possível imprimir em ${params.destino}. Verifique se o QZ Tray está aberto, aceite a permissão de rede e se a Bematech responde na porta 9100.${params.detalhe ? ` (${params.detalhe})` : ''}`
  }
  return `QZ Tray não conseguiu imprimir em "${params.destino}". Abra o QZ Tray no Windows (não use aba anônima sem extensão) ou configure IP direto em Configurações → Impressoras.${params.detalhe ? ` (${params.detalhe})` : ''}`
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

export function mensagemImpressoraVirtualPdf(nome: string): string {
  return `"${nome}" é impressora virtual (PDF), não a Bematech. Em Configurações → Impressoras, clique no botão IP e informe o endereço da impressora (ex.: 192.168.1.50, porta 9100), depois Salvar.`
}
