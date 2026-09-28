export type TcpPrinterRef = {
  host: string
  port: number
}

/** Interpreta `tcp://HOST:PORTA`, `HOST:PORTA` ou IP com porta 9100 padrão. */
export function parseTcpPrinterRef(ref: string): TcpPrinterRef | null {
  const trimmed = ref.trim()
  if (!trimmed) return null

  const tcpMatch = trimmed.match(/^tcp:\/\/([^:/]+):(\d{1,5})$/i)
  if (tcpMatch) {
    const port = parseInt(tcpMatch[2], 10)
    if (port >= 1 && port <= 65535) return { host: tcpMatch[1], port }
    return null
  }

  const ipPortMatch = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/)
  if (ipPortMatch) {
    const port = parseInt(ipPortMatch[2], 10)
    if (port >= 1 && port <= 65535) return { host: ipPortMatch[1], port }
  }

  const ipOnlyMatch = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (ipOnlyMatch) return { host: ipOnlyMatch[1], port: 9100 }

  return null
}

export function isTcpPrinterRef(ref: string): boolean {
  const t = ref.trim()
  return t.startsWith('tcp://') || parseTcpPrinterRef(t) !== null
}

export function formatTcpPrinterRef(host: string, port: number | string): string {
  return `tcp://${host.trim()}:${port}`
}
