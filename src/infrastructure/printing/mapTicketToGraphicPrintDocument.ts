import { criarMapTicketToGraphicPrintDocument } from '@/src/application/delivery/mapTicketToGraphicPrintDocument'
import { rasterizeCupomHtmlToPngBase64 } from '@/src/infrastructure/printing/rasterizeCupomHtml'

export const mapTicketToGraphicPrintDocument = criarMapTicketToGraphicPrintDocument({
  rasterizeCupomHtmlToPngBase64,
})
