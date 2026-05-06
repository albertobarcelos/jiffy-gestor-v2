import { NextRequest } from 'next/server'

/**
 * Obtém o token de autenticação da requisição.
 * Ordem: cookie `auth-token` (httpOnly, atualizado no login / escolher-empresa),
 * depois header `Authorization: Bearer`.
 * No cliente, `auth-storage` (Zustand) espelha o token para fetch com Bearer; no servidor o cookie costuma ser a fonte vigente.
 */
export function getAuthToken(request: NextRequest): string | null {
  // Prioriza cookie httpOnly para evitar uso de token stale do client store
  const token = request.cookies.get('auth-token')?.value
  if (token) {
    return token
  }

  // Fallback para header Authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return null
}

