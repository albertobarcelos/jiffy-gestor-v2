import type {
  VendaGestorTicket,
  VendaGestorTicketWarning,
  VendaGestorTicketsResponse,
} from '@/src/shared/types/vendaGestorTickets'

export const CODES_PRODUTO_SEM_IMPRESSORA = new Set([
  'PRODUTO_SEM_IMPRESSORA_SEM_FALLBACK',
  'PRODUTO_SEM_IMPRESSORA_FALLBACK_EXPEDICAO',
])

export function mensagemProdutoSemImpressora(nomeProduto: string | null | undefined): string {
  const nome = nomeProduto?.trim()
  if (nome) {
    return `O produto "${nome}" não tem impressora vinculada, então ele não será impresso no cupom.`
  }
  return 'Há produto sem impressora vinculada — ele não será impresso no cupom.'
}

export function nomeProdutoPorLancadoId(
  tickets: VendaGestorTicket[],
  produtoLancadoId: unknown
): string | null {
  if (produtoLancadoId == null) return null
  const id = String(produtoLancadoId).trim()
  if (!id) return null
  for (const ticket of tickets) {
    for (const item of ticket.itens ?? []) {
      if (String(item.produtoLancadoId ?? '').trim() === id) {
        const nome = item.nomeProduto?.trim()
        if (nome) return nome
      }
    }
  }
  return null
}

export function avisosProdutoSemImpressora(
  warnings: VendaGestorTicketWarning[] | undefined,
  tickets: VendaGestorTicket[],
  ignorarCodes: Set<string> = new Set()
): string[] {
  const vistos = new Set<string>()
  const mensagens: string[] = []

  for (const warning of warnings ?? []) {
    if (typeof warning === 'string') continue
    if (ignorarCodes.has(warning.code)) continue
    if (!CODES_PRODUTO_SEM_IMPRESSORA.has(warning.code)) continue

    const nomeProduto = nomeProdutoPorLancadoId(tickets, warning.contexto?.produtoLancadoId)
    const chave = nomeProduto ?? warning.code
    if (vistos.has(chave)) continue
    vistos.add(chave)

    mensagens.push(mensagemProdutoSemImpressora(nomeProduto))
  }

  return mensagens
}

export function avisosProdutoSemImpressoraDoPayload(
  payload: VendaGestorTicketsResponse
): string[] {
  return avisosProdutoSemImpressora(payload.warnings, payload.tickets)
}
