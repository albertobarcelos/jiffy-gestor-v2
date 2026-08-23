import { printAgentBaseUrl } from './localAgentClient'
import { isImpressoraVirtualPdf } from '@/src/infrastructure/printing/resolvePrinterDestinationForTicket'

export type AgentSystemPrinter = {
  name: string
  isDefault?: boolean
  isLocal?: boolean
  isNetwork?: boolean
}

export async function fetchAgentSystemPrinters(): Promise<AgentSystemPrinter[]> {
  const agentUrl = printAgentBaseUrl()
  const response = await fetch(`${agentUrl}/v1/system-printers`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(
      `Não foi possível listar as impressoras deste PC (${response.status}). Confira se o agent.exe está aberto.`
    )
  }
  const payload = (await response.json()) as { items?: Array<{ name?: string; isDefault?: boolean; isLocal?: boolean; isNetwork?: boolean }> }
  const items = Array.isArray(payload.items) ? payload.items : []
  const seen = new Set<string>()
  const unique: AgentSystemPrinter[] = []
  for (const item of items) {
    const name = String(item.name ?? '').trim()
    if (!name || isImpressoraVirtualPdf(name)) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push({
      name,
      isDefault: Boolean(item.isDefault),
      isLocal: Boolean(item.isLocal),
      isNetwork: Boolean(item.isNetwork),
    })
  }
  return unique
}
