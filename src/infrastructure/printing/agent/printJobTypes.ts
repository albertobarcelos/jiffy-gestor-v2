export {
  PRINT_JOB_SCHEMA_VERSION,
  type PrintAlign,
  type PrintContentBlock,
  type PrintDocument,
  type PrintSize,
} from '@/src/application/ports/printDocument'
import type { PrintDocument } from '@/src/application/ports/printDocument'

export type CreatePrintJobRequest = {
  jobId: string
  printerName: string
  copies?: number
  document: PrintDocument
}

export type CreatePrintJobResponse = {
  jobId: string
  status: string
  duplicate: boolean
}
