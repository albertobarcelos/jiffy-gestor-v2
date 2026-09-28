import { PRINT_JOB_SCHEMA_VERSION, type CreatePrintJobRequest } from './printJobTypes'

export const DEFAULT_PRINT_AGENT_URL = 'http://127.0.0.1:38471'

export function printAgentBaseUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PRINT_AGENT_URL?.trim() : ''
  return (fromEnv || DEFAULT_PRINT_AGENT_URL).replace(/\/+$/, '')
}

export function mensagemJiffyPrintIndisponivel(): string {
  return 'O Jiffy Print não está aberto neste computador. Se ainda não instalou, baixe e instale. Se já tem, abra pelo atalho ou pelo ícone ao lado do relógio.'
}

export const STORAGE_JIFFY_PRINT_DOWNLOAD = 'jiffy:jiffy-print-setup-baixado'

export function marcarDownloadJiffyPrintIniciado(): void {
  try {
    sessionStorage.setItem(STORAGE_JIFFY_PRINT_DOWNLOAD, new Date().toISOString())
  } catch {
    /* noop */
  }
}

export function jaPediuDownloadJiffyPrint(): boolean {
  try {
    return Boolean(sessionStorage.getItem(STORAGE_JIFFY_PRINT_DOWNLOAD))
  } catch {
    return false
  }
}

export type AgentPrintJobBody = CreatePrintJobRequest & {
  schemaVersion: number
  source: 'WEB'
  createdAt: string
}

export function buildAgentPrintJob(input: CreatePrintJobRequest): AgentPrintJobBody {
  return {
    schemaVersion: PRINT_JOB_SCHEMA_VERSION,
    jobId: input.jobId,
    printerName: input.printerName,
    source: 'WEB',
    createdAt: new Date().toISOString(),
    copies: input.copies ?? 1,
    document: input.document,
  }
}
