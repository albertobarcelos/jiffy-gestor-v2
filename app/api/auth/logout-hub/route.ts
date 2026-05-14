import { NextResponse } from 'next/server'
import { clearAuthCookie, AUTH_COOKIE_IDENTITY, AUTH_COOKIE_LEGACY } from '@/src/shared/utils/authCookies'

/**
 * Encerra só a sessão de identidade (hub Meus Apps).
 * Mantém `tenant-token` se existir (ERP continua logado noutra aba).
 */
export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Sessão do hub encerrada' },
    { status: 200 }
  )
  clearAuthCookie(response, AUTH_COOKIE_IDENTITY)
  clearAuthCookie(response, AUTH_COOKIE_LEGACY)
  return response
}
