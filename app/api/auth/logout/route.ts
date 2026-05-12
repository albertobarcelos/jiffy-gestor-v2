import { NextResponse } from 'next/server'
import {
  clearAuthCookie,
  AUTH_COOKIE_IDENTITY,
  AUTH_COOKIE_TENANT,
  AUTH_COOKIE_REFRESH,
  AUTH_COOKIE_LEGACY,
} from '@/src/shared/utils/authCookies'

/**
 * API Route para logout completo (identidade + tenant + legado).
 * POST /api/auth/logout
 */
export async function POST() {
  try {
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logout realizado com sucesso',
      },
      { status: 200 }
    )

    clearAuthCookie(response, AUTH_COOKIE_IDENTITY)
    clearAuthCookie(response, AUTH_COOKIE_TENANT)
    clearAuthCookie(response, AUTH_COOKIE_REFRESH)
    clearAuthCookie(response, AUTH_COOKIE_LEGACY)

    return response
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao fazer logout',
      },
      { status: 500 }
    )
  }
}

