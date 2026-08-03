import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_IDENTITY } from '@/src/shared/utils/authCookies'
import { decodeToken } from '@/src/shared/utils/validateToken'

/**
 * Lê só o cookie httpOnly `identity-token` (hub) — nunca o tenant.
 * Usado para reidratar o Zustand quando a memória do cliente perdeu a identidade
 * (HMR, outra aba, etc.) mas o cookie ainda é válido.
 */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_COOKIE_IDENTITY)?.value?.trim()
  if (!accessToken) {
    return NextResponse.json({ error: 'Identidade não encontrada' }, { status: 401 })
  }

  const decoded = decodeToken(accessToken)
  if (!decoded?.exp) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  const nowSec = Math.floor(Date.now() / 1000)
  if (decoded.exp <= nowSec) {
    return NextResponse.json({ error: 'Token expirado' }, { status: 401 })
  }

  return NextResponse.json({ accessToken }, { status: 200 })
}
