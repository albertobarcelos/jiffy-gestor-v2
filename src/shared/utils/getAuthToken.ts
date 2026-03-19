import { NextRequest } from 'next/server'

/**
 * Obtém o token de autenticação da requisição
 * Verifica primeiro no header Authorization, depois no cookie
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

