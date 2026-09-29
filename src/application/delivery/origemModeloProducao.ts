import {
  identificacaoClienteProducao,
  textoEscPosProducao,
} from '@/src/application/delivery/layoutProducao80mm'
import { JIFFY_PRINT_VERSION_FALLBACK } from '@/src/shared/constants/jiffyPrintSetup'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'

/** Versão no rodapé da produção: a do Jiffy Print, não a do Gestor. */
export const VERSAO_CUPOM_GESTOR = JIFFY_PRINT_VERSION_FALLBACK

export interface OrigemModeloProducaoDeTicketOptions {
  reimpressao?: boolean
  versao?: string
  nomeEmpresa?: string | null
  mostrarLogoTexto?: boolean
}

/** Hora impressa na produção: entrada em Em preparo, igual ao card. */
export function isoHoraProducaoDoPedido(root: VendaGestorTicketsResponse): string {
  const inicioEtapa = root.dataInicioPreparo?.trim()
  if (inicioEtapa) return inicioEtapa
  return root.dataPedido?.trim() || root.rastreamento?.geradoEm?.trim() || ''
}

export function origemModeloProducaoDeTicket(
  root: VendaGestorTicketsResponse,
  ticket: VendaGestorTicket,
  options?: OrigemModeloProducaoDeTicketOptions
) {
  const identificacao =
    textoEscPosProducao(root.identificacao ?? '') ||
    identificacaoClienteProducao(root.cliente?.nome ?? '')
  const mostrarEmpresa = options?.mostrarLogoTexto !== false
  const empresa = mostrarEmpresa
    ? textoEscPosProducao(
        options?.nomeEmpresa ||
          root.empresa?.nomeExibicao ||
          root.empresa?.nome ||
          root.empresa?.razaoSocial ||
          ''
      )
    : ''
  return {
    empresa: empresa || null,
    tipoVenda: root.tipoVenda,
    tipoEntrega: root.tipoEntrega,
    codigoVenda: root.codigoVenda || root.rastreamento?.codigoVenda,
    numeroVenda: root.numeroVenda ?? root.rastreamento?.numeroVenda,
    numeroMesa: root.numeroMesa,
    identificacao: identificacao || null,
    senha: root.senha ?? null,
    dataPedido: isoHoraProducaoDoPedido(root),
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
