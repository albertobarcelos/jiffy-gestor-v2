import { PRINT_JOB_SCHEMA_VERSION, type CreatePrintJobRequest } from './printJobTypes'

export const DEFAULT_PRINT_AGENT_URL = 'http://127.0.0.1:38471'

export function printAgentBaseUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PRINT_AGENT_URL?.trim() : ''
  return (fromEnv || DEFAULT_PRINT_AGENT_URL).replace(/\/+$/, '')
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
