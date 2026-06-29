declare module 'qz-tray' {
  interface QzWebSocket {
    isActive(): boolean
    connect(config?: Record<string, unknown>): Promise<void>
    disconnect(): Promise<void>
  }

  /** Destino: nome de impressora Windows OU conexão raw TCP `{ host, port }`. */
  type QzPrinterTarget = string | { host: string; port: string }

  /** Item de impressão estruturado (pixel/html/image ou raw com options). */
  interface QzPrintItem {
    type: string
    format: string
    flavor: string
    data: string
    options?: Record<string, unknown>
  }

  /** Conteúdo de impressão: objetos (pixel/html/raw) ou strings raw ESC/POS. */
  type QzPrintData = QzPrintItem[] | string[]

  interface QzConfigs {
    create(printer: QzPrinterTarget, opts?: Record<string, unknown>): QzConfig
  }

  interface QzConfig {
    print(data: QzPrintData, signature?: string, signingTimestamp?: number): void
  }

  interface QzPrint {
    (configs: QzConfig | QzConfig[], data: QzPrintData): Promise<void>
  }

  type QzSignaturePromiseFactory =
    | ((dataToSign: string) => Promise<string>)
    | ((
        dataToSign: string
      ) => (resolve: (value: string) => void, reject: (reason: unknown) => void) => void)

  interface QzSecurity {
    setCertificatePromise(
      handler:
        | ((resolve: (value: string) => void, reject: (reason: unknown) => void) => void)
        | (() => Promise<string>),
      options?: { rejectOnFailure?: boolean }
    ): void
    setSignaturePromise(factory: QzSignaturePromiseFactory): void
    setSignatureAlgorithm(algorithm: 'SHA1' | 'SHA256' | 'SHA512'): void
    getSignatureAlgorithm(): string
  }

  const qz: {
    websocket: QzWebSocket
    configs: QzConfigs
    print: QzPrint
    security: QzSecurity
    printers: {
      find(query?: string): Promise<string[] | string>
      details(): Promise<Array<{ name?: string }> | { name?: string }>
    }
  }
  export default qz
}
