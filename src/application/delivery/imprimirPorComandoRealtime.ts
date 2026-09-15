import { decidirTipoCupomComandoImpressaoRealtime } from '@/src/application/delivery/decidirTipoCupomComandoImpressaoRealtime'
import { filtrarTicketsPorTipoDecidido } from '@/src/application/delivery/filtrarTicketsPorTipoDecidido'
import { filtrarWarningsTicketsParaImpressao } from '@/src/application/delivery/filtrarWarningsTicketsParaImpressao'
import {
  imprimirTicketsApiGestor,
  notificarWarningsTickets,
} from '@/src/application/delivery/imprimirTicketsApiGestor'
import {
  jaImprimiuDeliveryRecentemente,
  marcarImpressaoDeliveryRecente,
} from '@/src/application/delivery/impressaoDeliveryDedupe'
import { fetchVendaGestorTickets } from '@/src/infrastructure/api/fetchVendaGestorTickets'
import type { DeliveryCupomTemplateConfig } from '@/src/shared/types/deliveryCupomTemplate'
import type { PreferenciasImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import type { EmpresaMeResumo } from '@/src/presentation/hooks/useEmpresaMe'
import { erroImpressao, logImpressao, warnImpressao } from '@/src/shared/utils/logImpressaoDelivery'

export type ImprimirPorComandoRealtimeResult =
  | 'skipped_dedupe'
  | 'sem_token'
  | 'erro_fetch'
  | 'sem_tickets'
  | 'ok'

export type ImprimirPorComandoRealtimeParams = {
  vendaId: string
  accessToken: string | undefined
  prefs: PreferenciasImpressaoDelivery
  empresa?: EmpresaMeResumo | null
  cupomTemplate?: DeliveryCupomTemplateConfig
  onMensagem?: (mensagem: string) => void
  onErro?: (mensagem: string) => void
  onAviso?: (mensagem: string) => void
}

/**
 * Impressao sob PEDIDO_DELIVERY_IMPRESSAO_SOLICITADA.
 * Nao reavalia imprimirAoReceber - o backend ja decidiu o comando.
 */
export async function imprimirPorComandoRealtime(
  params: ImprimirPorComandoRealtimeParams
): Promise<ImprimirPorComandoRealtimeResult> {
  const vendaId = params.vendaId.trim()
  logImpressao('realtime.comando.entrada', { vendaId })

  if (!vendaId) return 'erro_fetch'
  if (jaImprimiuDeliveryRecentemente(vendaId)) {
    logImpressao('realtime.comando.skipped_dedupe', { vendaId })
    return 'skipped_dedupe'
  }

  const token = params.accessToken?.trim()
  if (!token) {
    warnImpressao('realtime.comando.sem_token', { vendaId })
    return 'sem_token'
  }

  const ticketsFetch = await fetchVendaGestorTickets(vendaId, token, {
    prefs: params.prefs,
    empresa: params.empresa,
  })
  if (!ticketsFetch.ok) {
    erroImpressao('realtime.comando.fetch_erro', {
      vendaId,
      status: ticketsFetch.status,
      mensagem: ticketsFetch.error ?? null,
    })
    params.onErro?.(ticketsFetch.error || 'Não foi possível carregar os tickets do pedido.')
    return 'erro_fetch'
  }

  const tipoCupom = decidirTipoCupomComandoImpressaoRealtime(params.prefs.modo)
  const filtrados = filtrarTicketsPorTipoDecidido(ticketsFetch.data.tickets, tipoCupom)
  if (filtrados.length === 0) {
    warnImpressao('realtime.comando.sem_tickets', { vendaId, tipoCupom })
    return 'sem_tickets'
  }

  const wsLista = filtrarWarningsTicketsParaImpressao(
    ticketsFetch.data.warnings,
    filtrados
  )
  const imprimeProducao = filtrados.some(ticket => ticket.tipoCupom === 'producao')
  notificarWarningsTickets(wsLista, m => params.onMensagem?.(m), {
    ignorarCodes: ['MAPEAMENTO_IMPRESSORA_NAO_CONFIGURADO', 'IMPRESSORA_WINDOWS_NAO_MAPEADA'],
    tickets: ticketsFetch.data.tickets,
    imprimeProducao,
    warningsProdutoSemImpressora: ticketsFetch.data.warnings,
  })

  await imprimirTicketsApiGestor({
    response: ticketsFetch.data,
    ticketsAImprimir: filtrados,
    nomeEmpresa: params.empresa?.nomeExibicao,
    jobNamePrefix: 'Delivery',
    cupomTemplate: params.cupomTemplate,
    accessToken: token,
    onMensagem: params.onMensagem,
    onErro: params.onErro,
    onAviso: params.onAviso,
  })

  marcarImpressaoDeliveryRecente(vendaId)

  logImpressao('realtime.comando.ok', { vendaId, qTickets: filtrados.length })
  return 'ok'
}
