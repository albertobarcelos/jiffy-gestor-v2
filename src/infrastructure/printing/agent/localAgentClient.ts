import { PRINT_JOB_SCHEMA_VERSION, type CreatePrintJobRequest } from './printJobTypes'

export const DEFAULT_PRINT_AGENT_URL = 'http://127.0.0.1:38471'

export function printAgentBaseUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PRINT_AGENT_URL?.trim() : ''
  return (fromEnv || DEFAULT_PRINT_AGENT_URL).replace(/\/+$/, '')
}

function hostnameDeOrigin(origin: string | null | undefined): string {
  const bruto = String(origin ?? '').trim()
  if (!bruto) return ''
  try {
    return new URL(bruto.includes('://') ? bruto : `https://${bruto}`).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export function mensagemJiffyPrintIndisponivel(origin?: string | null): string {
  if (hostnameDeOrigin(origin).endsWith('.vercel.app')) {
    return 'O Jiffy Print não aceita o endereço de preview da Vercel. Abra o Gestor em http://localhost:5552 neste computador.'
  }
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

export async function fetchJiffyPrintVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${printAgentBaseUrl()}/v1/version`, {
      signal: AbortSignal.timeout(800),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { version?: unknown }
    const version = String(data.version ?? '').trim()
    return version || null
  } catch {
    return null
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
