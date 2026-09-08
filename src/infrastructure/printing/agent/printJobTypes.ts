export const PRINT_JOB_SCHEMA_VERSION = 1

export type PrintAlign = 'left' | 'center' | 'right'
export type PrintSize = 'small' | 'normal' | 'double'

export type PrintContentBlock =
  | { type: 'text'; text: string; align?: PrintAlign; bold?: boolean; size?: PrintSize }
  | { type: 'item'; quantity: number; name: string; bold?: boolean; size?: PrintSize }
  | { type: 'row'; left?: string; right?: string; bold?: boolean; size?: PrintSize }
  | { type: 'divider'; style?: 'single' | 'double' }
  | { type: 'feed'; lines: number }
  | { type: 'cut' }
  | { type: 'qrcode'; data: string; moduleSize?: number }
  | { type: 'image'; data: string; align?: PrintAlign }

export type PrintDocument = {
  type: string
  columns?: number
  content: PrintContentBlock[]
}

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
