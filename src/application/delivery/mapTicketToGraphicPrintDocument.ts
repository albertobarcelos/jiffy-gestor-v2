import {
  headerEmpresaEscPos,
  headerIdentidadeComContorno,
  identidadeCabecalhoGrafico,
} from '@/src/application/delivery/cupomPrintHeaderBlocks'
import {
  columnsFromCupomTemplate,
  graphicRasterScale,
  mergeCupomTemplate,
} from '@/src/application/delivery/cupomPrintLayout'
import { renderDeliveryCupomHtml, larguraCupomDeliveryPx } from '@/src/application/delivery/renderDeliveryCupomHtml'
import type { DesenharMolduraIdentidade } from '@/src/application/ports/IDesenharPilulaProducao'
import type { RasterizeCupomHtmlToPngBase64 } from '@/src/application/ports/IRasterizeCupomHtml'
import type { PrintContentBlock, PrintDocument } from '@/src/application/ports/printDocument'
import type { DeliveryCupomTemplateConfig } from '@/src/shared/types/deliveryCupomTemplate'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'

/**
 * Folga depois do rodapé no cupom gráfico. O corte GS V 65 já avança até a faca;
 * 8 linhas somavam ~34 mm em branco. 2 linhas ≈ 8 mm — só para não cortar o texto.
 */
export const LINHAS_ANTES_DO_CORTE_GRAFICO = 2

export function buildGraphicPrintDocument(
  pngBase64: string,
  columns: number,
  header: PrintContentBlock[] = []
): PrintDocument {
  return {
    type: 'ORDER',
    columns,
    content: [
      ...header,
      { type: 'image', data: pngBase64, align: 'center' },
      { type: 'feed', lines: LINHAS_ANTES_DO_CORTE_GRAFICO },
      { type: 'cut' },
    ],
  }
}

function nomeEmpresaGrafico(
  root: VendaGestorTicketsResponse,
  fallback?: string
): string {
  return (
    root.empresa?.nomeExibicao?.trim() ||
    root.empresa?.nome?.trim() ||
    root.empresa?.razaoSocial?.trim() ||
    fallback?.trim() ||
    ''
  )
}

export type MapTicketToGraphicPrintDocumentOptions = {
  nomeEmpresa?: string
  template?: DeliveryCupomTemplateConfig
  desenharMolduraIdentidade?: DesenharMolduraIdentidade
}

export type MapTicketToGraphicPrintDocument = (
  root: VendaGestorTicketsResponse,
  ticket: VendaGestorTicket,
  options?: MapTicketToGraphicPrintDocumentOptions
) => Promise<PrintDocument>

export function criarMapTicketToGraphicPrintDocument(deps: {
  rasterizeCupomHtmlToPngBase64: RasterizeCupomHtmlToPngBase64
}): MapTicketToGraphicPrintDocument {
  return async function mapTicketToGraphicPrintDocument(
    root: VendaGestorTicketsResponse,
    ticket: VendaGestorTicket,
    options?: MapTicketToGraphicPrintDocumentOptions
  ): Promise<PrintDocument> {
    const template = mergeCupomTemplate(options?.template)
    const empresa = template.mostrarLogoTexto
      ? nomeEmpresaGrafico(root, options?.nomeEmpresa)
      : ''
    const identidade = identidadeCabecalhoGrafico(root)
    const html = renderDeliveryCupomHtml({
      root,
      ticket,
      nomeEmpresa: options?.nomeEmpresa,
      template,
      omitirNomeEmpresa: Boolean(empresa),
      omitirIdentidade: Boolean(identidade),
    })
    const widthPx = larguraCupomDeliveryPx(template.larguraMm)
    const png = await deps.rasterizeCupomHtmlToPngBase64(html, {
      widthPx,
      scale: graphicRasterScale(template.larguraMm),
    })
    return buildGraphicPrintDocument(png, columnsFromCupomTemplate(template), [
      ...headerEmpresaEscPos(empresa),
      ...headerIdentidadeComContorno(identidade, options?.desenharMolduraIdentidade),
    ])
  }
}
