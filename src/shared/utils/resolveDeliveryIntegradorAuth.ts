import type { NextRequest } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'

export type DeliveryIntegradorAuth = {
  bearerToken: string
  integradorToken?: string
}

/**
 * Resolve autenticação para rotas delivery que falam com a API integradora.
 * Preferência: JWT da sessão gestor (`Authorization` / cookie via `validateRequest`).
 * Fallback legado: header customizado `Bearer` + `integrador-token`.
 */
export function resolveDeliveryIntegradorAuth(
  request: NextRequest
): DeliveryIntegradorAuth | null {
  const validation = validateRequest(request)
  if (validation.valid && validation.tokenInfo?.token) {
    return { bearerToken: validation.tokenInfo.token }
  }

  const bearerToken = request.headers.get('Bearer') || request.headers.get('bearer')
  if (!bearerToken?.trim()) return null

  const integradorToken = request.headers.get('integrador-token')?.trim() || undefined
  return { bearerToken, integradorToken }
}
