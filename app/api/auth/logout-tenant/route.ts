import { NextResponse } from 'next/server'
import { clearAuthCookie, AUTH_COOKIE_TENANT } from '@/src/shared/utils/authCookies'

/**
 * Encerra só a sessão na empresa (token após escolher-empresa).
 * Mantém `identity-token` (hub / Meus Apps continua logado).
 */
export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Sessão da empresa encerrada' },
    { status: 200 }
  )
  clearAuthCookie(response, AUTH_COOKIE_TENANT)
  return response
}
