import { criarImprimirTicketsApiGestor } from '@/src/application/delivery/imprimirTicketsApiGestor'
import { buildPrintJobId } from '@/src/infrastructure/printing/agent/printJobId'
import { desenharPilulaProducaoPng } from '@/src/infrastructure/printing/pilulaProducaoPng'
import { desenharSeparadorTracejadoPng } from '@/src/infrastructure/printing/receiptBitmaps'
import { printDeliveryCupom } from '@/src/infrastructure/printing/printDeliveryCupom'

export {
  notificarWarningsTickets,
  type ImprimirTicketsApiGestorDeps,
  type ImprimirTicketsApiGestorParams,
} from '@/src/application/delivery/imprimirTicketsApiGestor'

export const imprimirTicketsApiGestor = criarImprimirTicketsApiGestor({
  desenharPilula: desenharPilulaProducaoPng,
  desenharSeparador: desenharSeparadorTracejadoPng,
  enviarCupom: printDeliveryCupom,
  gerarJobId: buildPrintJobId,
})
