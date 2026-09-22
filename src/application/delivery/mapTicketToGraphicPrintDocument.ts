import { renderDeliveryCupomHtml, larguraCupomDeliveryPx } from '@/src/application/delivery/renderDeliveryCupomHtml'
import { columnsFromCupomTemplate, mergeCupomTemplate } from '@/src/application/delivery/cupomPrintLayout'
import {
  graphicRasterScale,
  rasterizeCupomHtmlToPngBase64,
} from '@/src/infrastructure/printing/rasterizeCupomHtml'
import type { PrintDocument } from '@/src/application/ports/printDocument'
import type { DeliveryCupomTemplateConfig } from '@/src/shared/types/deliveryCupomTemplate'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'

/**
 * Folga depois do rodapé no cupom gráfico. O corte GS V 65 já avança até a faca;
 * 8 linhas somavam ~34 mm em branco. 2 linhas ≈ 8 mm — só para não cortar o texto.
 */
export const LINHAS_ANTES_DO_CORTE_GRAFICO = 2

export function buildGraphicPrintDocument(pngBase64: string, columns: number): PrintDocument {
  return {
    type: 'ORDER',
    columns,
    content: [
      { type: 'image', data: pngBase64, align: 'center' },
      { type: 'feed', lines: LINHAS_ANTES_DO_CORTE_GRAFICO },
      { type: 'cut' },
    ],
  }
}

export async function mapTicketToGraphicPrintDocument(
  root: VendaGestorTicketsResponse,
  ticket: VendaGestorTicket,
  options?: { nomeEmpresa?: string; template?: DeliveryCupomTemplateConfig }
): Promise<PrintDocument> {
  const template = mergeCupomTemplate(options?.template)
  const html = renderDeliveryCupomHtml({
    root,
    ticket,
    nomeEmpresa: options?.nomeEmpresa,
    template,
  })
  const widthPx = larguraCupomDeliveryPx(template.larguraMm)
  const png = await rasterizeCupomHtmlToPngBase64(html, {
    widthPx,
    scale: graphicRasterScale(template.larguraMm),
  })
  return buildGraphicPrintDocument(png, columnsFromCupomTemplate(template))
}
