import { buildCupomFromVendaGestorTicket } from '@/src/application/delivery/buildCupomFromVendaGestorTicket'
import {
  avisosProdutoSemImpressora,
  CODES_PRODUTO_SEM_IMPRESSORA,
  mensagemProdutoSemImpressora,
} from '@/src/application/delivery/deliveryProdutoSemImpressoraAvisos'
import { warningRedundanteMapeamentoImpressoraWindows } from '@/src/application/delivery/deliveryTicketWarningUtils'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'
import { printDeliveryCupom } from '@/src/infrastructure/printing/printDeliveryCupom'
import { logImpressao, warnImpressao } from '@/src/shared/utils/logImpressaoDelivery'
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
  PRODUTO_SEM_IMPRESSORA_FALLBACK_EXPEDICAO: mensagemProdutoSemImpressora(null),
  PRODUTO_SEM_IMPRESSORA_SEM_FALLBACK: mensagemProdutoSemImpressora(null),
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
  options?: {
    ignorarCodes?: string[]
    tickets?: VendaGestorTicket[]
    /** Lote inclui cupom de produção — exibe aviso por produto sem impressora. */
    imprimeProducao?: boolean
    /** Payload completo da API; garante aviso igual ao da transição do Kanban. */
    warningsProdutoSemImpressora?: VendaGestorTicketsResponse['warnings']
  }
): void {
  const ignorar = new Set(options?.ignorarCodes ?? [])

  if (options?.imprimeProducao && options.tickets?.length) {
    const fonteProduto = options.warningsProdutoSemImpressora ?? warnings
    for (const mensagem of avisosProdutoSemImpressora(fonteProduto, options.tickets, ignorar)) {
      onInfo(mensagem)
    }
    for (const code of CODES_PRODUTO_SEM_IMPRESSORA) {
      ignorar.add(code)
    }
  }

  for (const w of warnings ?? []) {
    if (warningRedundanteMapeamentoImpressoraWindows(w)) continue
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
      // Falha de impressão é operacional (impressora/serviço), não bug de código: warn não polui o painel "Issues".
      warnImpressao('ticket.print_falhou', { metodo: r.metodo, mensagem: r.mensagem ?? null })
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
