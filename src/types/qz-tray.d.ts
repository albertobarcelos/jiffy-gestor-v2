declare module 'qz-tray' {
  interface QzWebSocket {
    isActive(): boolean
    connect(config?: Record<string, unknown>): Promise<void>
    disconnect(): Promise<void>
  }

  interface QzConfigs {
    create(printer: string, opts?: Record<string, unknown>): QzConfig
  }

  interface QzConfig {
    print(
      data: Array<{ type: string; format: string; flavor: string; data: string }>,
      signature?: string,
      signingTimestamp?: number
    ): void
  }

  interface QzPrint {
    (
      configs: QzConfig | QzConfig[],
      data: Array<{ type: string; format: string; flavor: string; data: string }>
    ): Promise<void>
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
