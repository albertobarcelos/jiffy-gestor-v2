import {
  identificacaoClienteProducao,
  textoEscPosProducao,
} from '@/src/application/delivery/layoutProducao80mm'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'

export const VERSAO_CUPOM_GESTOR = '0.1.0'

export interface OrigemModeloProducaoDeTicketOptions {
  reimpressao?: boolean
  versao?: string
}

export function origemModeloProducaoDeTicket(
  root: VendaGestorTicketsResponse,
  ticket: VendaGestorTicket,
  options?: OrigemModeloProducaoDeTicketOptions
) {
  const identificacao =
    textoEscPosProducao(root.identificacao ?? '') ||
    identificacaoClienteProducao(root.cliente?.nome ?? '')
  return {
    tipoVenda: root.tipoVenda,
    codigoVenda: root.codigoVenda || root.rastreamento?.codigoVenda,
    numeroMesa: root.numeroMesa,
    identificacao: identificacao || null,
    senha: root.senha ?? null,
    dataPedido: root.dataPedido || root.rastreamento?.geradoEm,
    atendente: root.tiradoPor?.nome ?? '',
    codigoTerminal: root.codigoTerminal,
    versao: options?.versao ?? VERSAO_CUPOM_GESTOR,
    nomeImpressora: ticket.impressoraNome || ticket.impressora?.nome || null,
    observacaoPedido: root.observacaoPedido ?? null,
    reimpressao: Boolean(options?.reimpressao),
    via: ticket.viaProducao,
    itens: ticket.itens,
  }
}
