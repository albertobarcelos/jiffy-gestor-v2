import { mapTicketToPrintDocument } from '@/src/application/delivery/mapTicketToPrintDocument'
import { mapTicketToGraphicPrintDocument } from '@/src/application/delivery/mapTicketToGraphicPrintDocument'
import {
  avisosProdutoSemImpressora,
  CODES_PRODUTO_SEM_IMPRESSORA,
  mensagemProdutoSemImpressora,
} from '@/src/application/delivery/deliveryProdutoSemImpressoraAvisos'
import { warningRedundanteMapeamentoImpressoraWindows } from '@/src/application/delivery/deliveryTicketWarningUtils'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'
import { printDeliveryCupom } from '@/src/infrastructure/printing/printDeliveryCupom'
import { buildPrintJobId, ticketPrintKey } from '@/src/infrastructure/printing/agent/printJobId'
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
  PRODUTO_SEM_IMPRESSORA_FALLBACK_EXPEDICAO: mensagemProdutoSemImpressora(null),
  PRODUTO_SEM_IMPRESSORA_SEM_FALLBACK: mensagemProdutoSemImpressora(null),
}

function ticketProducaoEhFallbackSemImpressoraProduto(ticket: VendaGestorTicket): boolean {
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
    imprimeProducao?: boolean
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
 * Envia cada ticket ao Print Orchestrator (agente Windows).
 */
export async function imprimirTicketsApiGestor(params: {
  response: VendaGestorTicketsResponse
  ticketsAImprimir: VendaGestorTicket[]
  nomeEmpresa?: string
  jobNamePrefix: string
  cupomTemplate?: DeliveryCupomTemplateConfig
  accessToken?: string
  onMensagem?: (mensagem: string) => void
  onErro?: (mensagem: string) => void
}): Promise<void> {
  const {
    response,
    ticketsAImprimir,
    nomeEmpresa,
    jobNamePrefix,
    cupomTemplate,
    onErro,
  } = params
  const reimpressao = jobNamePrefix.toLowerCase().includes('reimpress')

  logImpressao('imprimirLote.inicio', {
    jobNamePrefix,
    numeroVenda: response.numeroVenda,
    vendaIdResumo: response.vendaId?.slice?.(0, 8),
    ticketsNoLote: ticketsAImprimir.length,
    transporte: 'agent',
    reimpressao,
  })

  let impressos = 0
  let falhas = 0
  let ignoradosSemItens = 0
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

    const printerName =
      ticket.impressora?.nomeImpressoraWindows?.trim() || ticket.nomeImpressoraWindows?.trim() || ''
    if (!printerName) {
      falhas += 1
      const nomeLogica = ticket.impressoraNome?.trim() || ticket.impressora?.nome?.trim() || 'lógica'
      const mensagem = `Vincule a impressora "${nomeLogica}" a uma impressora deste PC em Configurações de impressão.`
      erroImpressao('ticket.sem_impressora_fisica', {
        tipoCupom: ticket.tipoCupom,
        impressoraId: ticket.impressoraId,
      })
      onErro?.(mensagem)
      continue
    }

    let document
    try {
      document =
        cupomTemplate?.modoPapel === 'grafico'
          ? await mapTicketToGraphicPrintDocument(response, ticket, {
              nomeEmpresa,
              template: cupomTemplate,
            })
          : mapTicketToPrintDocument(response, ticket, {
              nomeEmpresa,
              template: cupomTemplate,
            })
    } catch (error) {
      falhas += 1
      const mensagem =
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Falha ao montar o cupom gráfico.'
      warnImpressao('ticket.grafico_falhou', {
        mensagem,
        causa: error instanceof Error ? error.message : String(error),
      })
      onErro?.(mensagem)
      continue
    }
    const jobId = buildPrintJobId({
      vendaId: response.vendaId,
      tipoCupom: ticket.tipoCupom,
      ticketKey: ticketPrintKey(ticket),
      reimpressao,
    })
    const copies = Math.min(20, Math.max(1, Number(ticket.copias) || 1))

    logImpressao('ticket.envio', {
      tipoCupom: ticket.tipoCupom,
      impressoraId: ticket.impressoraId ?? null,
      printerName,
      jobId,
      copiasTicket: copies,
      blocos: document.content.length,
    })

    const r = await printDeliveryCupom({
      jobId,
      printerName,
      copies,
      document,
    })
    if (r.ok) impressos += 1
    if (!r.ok) falhas += 1

    logImpressao('ticket.resultado_print', {
      ok: r.ok,
      duplicate: r.duplicate ?? false,
      mensagemInterna: r.mensagem?.slice?.(0, 200) ?? null,
      copies,
      printerName,
    })

    if (!r.ok) {
      erroImpressao('ticket.print_falhou', { mensagem: r.mensagem ?? null })
      onErro?.(r.mensagem ?? 'Falha ao imprimir o cupom.')
    }
  }

  logImpressao('imprimirLote.fim', {
    numeroVenda: response.numeroVenda,
    impressos,
    falhas,
    ignoradosSemItens,
    ignoradosFallbackProdutoSemImpressora,
  })
}
