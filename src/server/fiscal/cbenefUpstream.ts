import { ApiClient } from '@/src/infrastructure/api/apiClient'

function fiscalMicroserviceBase(): string {
  return (process.env.FISCAL_MICROSERVICE_BASE_URL || process.env.FISCAL_SERVICE_URL || '')
    .trim()
    .replace(/\/$/, '')
}

/**
 * Paths nativos do microsserviço fiscal (Swagger /v3/api-docs):
 * - GET  /v1/configuracoes/cbenef/por-uf/{uf}?cst=
 * - GET  /v1/configuracoes/cbenef/validar/{codigo}
 * - POST /v1/configuracoes/cbenef/importar  (multipart campo `arquivo`)
 *
 * No gateway PDV o prefixo vira `/api/v1/fiscal/...` (mesmo padrão de CEST/NCM).
 */
export async function requestCbenefUpstream<T>(
  nativePath: string,
  options: RequestInit
): Promise<{ data: T; status: number }> {
  const fiscalBase = fiscalMicroserviceBase()
  if (fiscalBase) {
    return new ApiClient(fiscalBase).request<T>(nativePath, options)
  }

  const gatewayPath = nativePath.replace(/^\/v1\//, '/api/v1/fiscal/')
  return new ApiClient().request<T>(gatewayPath, options)
}
