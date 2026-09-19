import type { PrintDocument } from '@/src/application/ports/printDocument'

export type EnviarCupomPrintJobInput = {
  jobId: string
  printerName: string
  copies: number
  document: PrintDocument
}

export type EnviarCupomPrintJobResult = {
  ok: boolean
  duplicate?: boolean
  mensagem?: string
}

export type EnviarCupomPrintJob = (
  input: EnviarCupomPrintJobInput
) => Promise<EnviarCupomPrintJobResult>
