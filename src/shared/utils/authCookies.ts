import type { NextResponse } from 'next/server'

/** Cookie httpOnly: JWT do login (hub / identidade), sem troca por empresa. */
export const AUTH_COOKIE_IDENTITY = 'identity-token'
/** Cookie httpOnly: JWT após POST escolher-empresa (tenant). */
export const AUTH_COOKIE_TENANT = 'tenant-token'
/** Cookie httpOnly: refresh token da última empresa aberta (longa duração). */
export const AUTH_COOKIE_REFRESH = 'refresh-token'
/** Legado (login antigo); ainda lido em getAuthToken até migração completa. */
export const AUTH_COOKIE_LEGACY = 'auth-token'

const baseOpts = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
}

export function cookieOptsMaxAge(seconds: number) {
  return { ...baseOpts, maxAge: seconds }
}

export function clearAuthCookie(response: NextResponse, name: string) {
  response.cookies.delete(name)
  response.cookies.set(name, '', {
    ...baseOpts,
    maxAge: 0,
  })
}
