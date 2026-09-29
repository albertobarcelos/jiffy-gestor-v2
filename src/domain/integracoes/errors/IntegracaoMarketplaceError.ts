export class IntegracaoMarketplaceError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status = 502, code = 'INTEGRACAO_HUB_ERROR') {
    super(message)
    this.name = 'IntegracaoMarketplaceError'
    this.status = status
    this.code = code
  }
}

export function isIntegracaoMarketplaceError(
  error: unknown
): error is IntegracaoMarketplaceError {
  return error instanceof IntegracaoMarketplaceError
}
