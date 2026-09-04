import { NextRequest } from 'next/server'
import {
  AUTH_COOKIE_IDENTITY,
  AUTH_COOKIE_LEGACY,
  AUTH_COOKIE_TENANT,
} from '@/src/shared/utils/authCookies'

/**
 * Obtém o token JWT da requisição.
 * Ordem: header `Authorization` (cliente envia o bearer desejado),
 * depois `tenant-token`, `identity-token`, cookie legado `auth-token`.
 */
export function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const bearer = authHeader.substring(7).trim()
    if (bearer.length > 0) {
      return bearer
    }
  }

  const tenant = request.cookies.get(AUTH_COOKIE_TENANT)?.value
  if (tenant) {
    return tenant
  }

  const identity = request.cookies.get(AUTH_COOKIE_IDENTITY)?.value
  if (identity) {
    return identity
  }

  return request.cookies.get(AUTH_COOKIE_LEGACY)?.value ?? null
}

