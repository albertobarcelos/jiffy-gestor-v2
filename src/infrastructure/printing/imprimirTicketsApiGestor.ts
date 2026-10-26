import { criarImprimirTicketsApiGestor } from '@/src/application/delivery/imprimirTicketsApiGestor'
import { buildPrintJobId } from '@/src/infrastructure/printing/agent/printJobId'
import { mapTicketToGraphicPrintDocument } from '@/src/infrastructure/printing/mapTicketToGraphicPrintDocument'
import { desenharCodigoBarras128Png } from '@/src/infrastructure/printing/codigoBarras128Png'
import { desenharSimboloPedidoLinhaPng } from '@/src/infrastructure/printing/simboloPedidoLinhaPng'
import {
  desenharMolduraIdentidadePng,
  desenharPilulaProducaoPng,
} from '@/src/infrastructure/printing/pilulaProducaoPng'
import { fetchJiffyPrintVersion } from '@/src/infrastructure/printing/agent/localAgentClient'
import { printDeliveryCupom } from '@/src/infrastructure/printing/printDeliveryCupom'
import { desenharSeparadorTracejadoPng } from '@/src/shared/printing/receiptBitmaps'

export const imprimirTicketsApiGestor = criarImprimirTicketsApiGestor({
  desenharPilula: desenharPilulaProducaoPng,
  desenharMolduraIdentidade: desenharMolduraIdentidadePng,
  desenharSeparador: desenharSeparadorTracejadoPng,
  desenharCodigoBarras: desenharCodigoBarras128Png,
  desenharSimboloPedidoLinha: desenharSimboloPedidoLinhaPng,
  mapTicketToGraphicPrintDocument,
  enviarCupom: printDeliveryCupom,
  gerarJobId: buildPrintJobId,
  obterVersaoJiffyPrint: fetchJiffyPrintVersion,
})
