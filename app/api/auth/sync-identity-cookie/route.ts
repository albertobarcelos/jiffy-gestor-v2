import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_IDENTITY,
  cookieOptsMaxAge,
} from '@/src/shared/utils/authCookies'
import { decodeToken } from '@/src/shared/utils/validateToken'

/**
 * Regrava o cookie httpOnly de identidade a partir do JWT ainda válido no cliente
 * (Zustand). Usado ao voltar ao hub após logout da empresa, quando o cookie pode
 * ter expirado no browser enquanto a sessão em memória ainda é válida.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { accessToken?: unknown } | null
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : ''
    if (!accessToken) {
      return NextResponse.json({ error: 'Token não informado' }, { status: 400 })
    }

    const decoded = decodeToken(accessToken)
    if (!decoded?.exp) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const nowSec = Math.floor(Date.now() / 1000)
    if (decoded.exp <= nowSec) {
      return NextResponse.json({ error: 'Token expirado' }, { status: 401 })
    }

    const maxAge = Math.max(decoded.exp - nowSec, 60)
    const response = NextResponse.json({ success: true }, { status: 200 })
    response.cookies.set(AUTH_COOKIE_IDENTITY, accessToken, cookieOptsMaxAge(maxAge))
    return response
  } catch {
    return NextResponse.json({ error: 'Erro ao sincronizar identidade' }, { status: 500 })
  }
}
