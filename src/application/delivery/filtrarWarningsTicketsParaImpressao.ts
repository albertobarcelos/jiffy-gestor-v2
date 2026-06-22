import type {
  VendaGestorTicket,
  VendaGestorTicketWarning,
} from '@/src/shared/types/vendaGestorTickets'
import { warningRedundanteMapeamentoImpressoraWindows } from '@/src/application/delivery/deliveryTicketWarningUtils'
import { logImpressao } from '@/src/shared/utils/logImpressaoDelivery'
function impressoraIdsDosTickets(tickets: VendaGestorTicket[]): Set<string> {
  const ids = new Set<string>()
  for (const ticket of tickets) {
    const id = ticket.impressoraId ?? ticket.impressora?.id
    if (id != null && String(id).trim()) {
      ids.add(String(id).trim())
    }
  }
  return ids
}

/**
 * Mantém avisos da API apenas para o lote que será impresso agora
 * (ex.: em Pronto/expedição não exibe MAPEAMENTO das impressoras de produção).
 */
export function filtrarWarningsTicketsParaImpressao(
  warnings: VendaGestorTicketWarning[] | undefined,
  ticketsAImprimir: VendaGestorTicket[]
): VendaGestorTicketWarning[] {
  if (!warnings?.length || !ticketsAImprimir.length) return []

  const impressoraIds = impressoraIdsDosTickets(ticketsAImprimir)
  const imprimeProducao = ticketsAImprimir.some(ticket => ticket.tipoCupom === 'producao')
  const imprimeExpedicaoOuUnificado = ticketsAImprimir.some(
    ticket => ticket.tipoCupom === 'expedicao' || ticket.tipoCupom === 'unificado'
  )

  const filtrados = warnings.filter(warning => {
    if (warningRedundanteMapeamentoImpressoraWindows(warning)) return false
    if (typeof warning === 'string') return true

    const ctx = warning.contexto ?? {}

    switch (warning.code) {
      case 'MAPEAMENTO_IMPRESSORA_NAO_CONFIGURADO':
      case 'IMPRESSORA_WINDOWS_NAO_MAPEADA':
        return false
      case 'PRODUTO_SEM_IMPRESSORA_SEM_FALLBACK':
      case 'PRODUTO_SEM_IMPRESSORA_FALLBACK_EXPEDICAO': {
        if (!imprimeProducao) return false
        // Produto sem impressora pode não constar nos tickets de produção — aviso vale para o lote.
        const produtoLancadoId =
          ctx.produtoLancadoId != null ? String(ctx.produtoLancadoId).trim() : ''
        return Boolean(produtoLancadoId)
      }
      case 'IMPRESSORA_EXPEDICAO_NAO_CONFIGURADA':
        return imprimeExpedicaoOuUnificado
      case 'VENDA_CANCELADA':
      case 'ESTACAO_IMPRESSAO_NAO_ENCONTRADA':
      case 'ESTACAO_IMPRESSAO_NAO_INFORMADA':
        return true
      default: {
        const impressoraId =
          ctx.impressoraId != null ? String(ctx.impressoraId).trim() : ''
        if (impressoraId) return impressoraIds.has(impressoraId)
        const produtoLancadoId =
          ctx.produtoLancadoId != null ? String(ctx.produtoLancadoId).trim() : ''
        if (produtoLancadoId) {
          return imprimeProducao
        }
        return false
      }
    }
  })

  logImpressao('filtrarWarnings.paraImpressao', {
    warningsTotal: warnings.length,
    warningsFiltrados: filtrados.length,
    ticketsNoLote: ticketsAImprimir.length,
    tiposNoLote: ticketsAImprimir.map(t => t.tipoCupom),
    imprimeProducao,
    imprimeExpedicaoOuUnificado,
  })

  return filtrados
}
