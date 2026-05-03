import { buildCupomFromVendaGestorTicket } from '@/src/application/delivery/buildCupomFromVendaGestorTicket'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'
import { printDeliveryCupom } from '@/src/infrastructure/printing/printDeliveryCupom'
import { erroImpressao, logImpressao, warnImpressao } from '@/src/shared/utils/logImpressaoDelivery'
import type { DeliveryCupomTemplateConfig } from '@/src/shared/types/deliveryCupomTemplate'

const AVISO_TEXTO: Record<string, string> = {
  VENDA_CANCELADA: 'Pedido cancelado — sem tickets para impressão.',
  ESTACAO_IMPRESSAO_NAO_INFORMADA:
    'Estação de impressão não configurada neste terminal.',
  ESTACAO_IMPRESSAO_NAO_ENCONTRADA:
    'Estação de impressão não encontrada para esta empresa.',
  IMPRESSORA_WINDOWS_NAO_MAPEADA:
    'Há impressoras lógicas sem vínculo com uma impressora do Windows nesta estação.',
  IMPRESSORA_EXPEDICAO_NAO_CONFIGURADA:
    'Impressora de expedição não configurada na empresa (considere configurar em parâmetros).',
  PRODUTO_SEM_IMPRESSORA_FALLBACK_EXPEDICAO:
    'Algum produto sem impressora mapeada — verifique a configuração de impressão do pedido.',
  PRODUTO_SEM_IMPRESSORA_SEM_FALLBACK:
    'Algum produto sem impressora e sem fallback de expedição — linha omitida dos tickets.',
}

function ticketProducaoEhFallbackSemImpressoraProduto(ticket: VendaGestorTicket): boolean {
  // Regra restrita ao cupom de produção: unificado e expedição continuam seguindo o ticket da API.
  if (ticket.tipoCupom !== 'producao') return false
  const origem = String(ticket.impressora?.origem ?? '')
    .trim()
    .toLowerCase()
  if (!origem) return false
  return origem.includes('fallback') || origem.includes('expedicao') || origem.includes('padr')
}

export function notificarWarningsTickets(
  warnings: VendaGestorTicketsResponse['warnings'],
  onInfo: (mensagem: string) => void,
  options?: { ignorarCodes?: string[] }
): void {
  const ignorar = new Set(options?.ignorarCodes ?? [])
  for (const w of warnings ?? []) {
    const key = typeof w === 'string' ? w : w.code
    if (ignorar.has(key)) continue
    const message = typeof w === 'string' ? undefined : w.message
    const detalhe = typeof w === 'string' ? undefined : w.detalhe
    onInfo(message || detalhe || AVISO_TEXTO[key] || key)
  }
}

/**
 * Envia cada ticket ao QZ (ou fallback browser) com cópias e impressora indicadas pelo backend.
 */
export async function imprimirTicketsApiGestor(params: {
  response: VendaGestorTicketsResponse
  ticketsAImprimir: VendaGestorTicket[]
  nomeEmpresa?: string
  jobNamePrefix: string
  cupomTemplate?: DeliveryCupomTemplateConfig
  onMensagem?: (mensagem: string) => void
}): Promise<void> {
  const {
    response,
    ticketsAImprimir,
    nomeEmpresa,
    jobNamePrefix,
    cupomTemplate,
    onMensagem,
  } = params

  logImpressao('imprimirLote.inicio', {
    jobNamePrefix,
    numeroVenda: response.numeroVenda,
    vendaIdResumo: response.vendaId?.slice?.(0, 8),
    ticketsNoLote: ticketsAImprimir.length,
  })

  let impressosQz = 0
  let impressosBrowser = 0
  let ignoradosSemItens = 0
  let ignoradosSemImpressora = 0
  let ignoradosFallbackProdutoSemImpressora = 0

  for (const ticket of ticketsAImprimir) {
    if (ticketProducaoEhFallbackSemImpressoraProduto(ticket)) {
      ignoradosFallbackProdutoSemImpressora += 1
      warnImpressao('ticket.producao_fallback_produto_sem_impressora_pulado', {
        tipoCupom: ticket.tipoCupom,
        impressoraId: ticket.impressoraId,
        impressoraOrigem: ticket.impressora?.origem ?? null,
        qItens: ticket.itens?.length ?? 0,
      })
      continue
    }

    if (!ticket.itens?.length) {
      ignoradosSemItens += 1
      warnImpressao('ticket.pulado', {
        motivo: 'sem_itens',
        tipoCupom: ticket.tipoCupom,
        impressoraId: ticket.impressoraId,
      })
      continue
    }

    const html = buildCupomFromVendaGestorTicket(response, ticket, {
      nomeEmpresa,
      template: cupomTemplate,
    })
    const printerName =
      ticket.impressora?.nomeImpressoraWindows?.trim() ||
      ticket.nomeImpressoraWindows?.trim() ||
      null
    logImpressao('ticket.envio', {
      tipoCupom: ticket.tipoCupom,
      impressoraId: ticket.impressoraId ?? null,
      impressoraNomeLogico: ticket.impressoraNome?.slice(0, 40) ?? null,
      nomeImpressoraWindowsResolvido:
        printerName ?? '(ausente — sem impressão até vincular estação/impressoras no ticket)',
      copiasTicket: ticket.copias ?? 1,
      htmlChars: html.length,
    })
    if (!printerName) {
      ignoradosSemImpressora += 1
      const destino = ticket.impressoraNome?.trim() || ticket.impressoraId || ticket.tipoCupom
      warnImpressao('ticket.sem_nome_windows', { destino, tipoCupom: ticket.tipoCupom })
      onMensagem?.(`Ticket ${destino} não enviado: impressora Windows não vinculada à estação.`)
      continue
    }
    const copies = Math.min(20, Math.max(1, Number(ticket.copias) || 1))

    const r = await printDeliveryCupom({
      html,
      printerName,
      copies,
      jobName: `${jobNamePrefix} #${response.numeroVenda}`,
    })
    if (r.ok && r.metodo === 'qz') impressosQz += 1
    if (r.ok && r.metodo === 'browser') impressosBrowser += 1

    logImpressao('ticket.resultado_print', {
      ok: r.ok,
      metodo: r.metodo,
      mensagemInterna: r.mensagem?.slice?.(0, 200) ?? null,
      copies,
      printerResumido: printerName.slice(0, 50),
    })

    if (!r.ok) {
      erroImpressao('ticket.print_falhou', { metodo: r.metodo, mensagem: r.mensagem ?? null })
    }

    if (r.ok && r.mensagem) onMensagem?.(r.mensagem)
  }

  logImpressao('imprimirLote.fim', {
    numeroVenda: response.numeroVenda,
    impressosQz,
    impressosBrowser,
    ignoradosSemItens,
    ignoradosSemImpressora,
    ignoradosFallbackProdutoSemImpressora,
  })
}
