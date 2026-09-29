import { criarImprimirTicketsApiGestor } from '@/src/application/delivery/imprimirTicketsApiGestor'
import { buildPrintJobId } from '@/src/infrastructure/printing/agent/printJobId'
import { mapTicketToGraphicPrintDocument } from '@/src/infrastructure/printing/mapTicketToGraphicPrintDocument'
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
  mapTicketToGraphicPrintDocument,
  enviarCupom: printDeliveryCupom,
  gerarJobId: buildPrintJobId,
  obterVersaoJiffyPrint: fetchJiffyPrintVersion,
})
