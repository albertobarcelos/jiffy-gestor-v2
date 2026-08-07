import { NextResponse } from 'next/server'
import { clearAuthCookie, AUTH_COOKIE_TENANT } from '@/src/shared/utils/authCookies'

/**
 * Encerra só a sessão da empresa **nesta navegação** (cookie `tenant-token`).
 * Mantém `identity-token` e `refresh-token` — o refresh é a ponte global do hub
 * quando o identity já expirou (ver 4.FLUXO_VOLTAR_AO_MEU_JIFFY.md).
 */
export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Sessão da empresa encerrada' },
    { status: 200 }
  )
  clearAuthCookie(response, AUTH_COOKIE_TENANT)
  return response
}
