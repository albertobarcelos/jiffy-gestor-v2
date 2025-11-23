import { NextRequest } from 'next/server'

/**
 * Obtém o token de autenticação da requisição
 * Verifica primeiro no header Authorization, depois no cookie
 */
export function getAuthToken(request: NextRequest): string | null {
  // Tenta obter do header Authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Tenta obter do cookie
  const token = request.cookies.get('auth-token')?.value
  if (token) {
    return token
  }

  return null
}

