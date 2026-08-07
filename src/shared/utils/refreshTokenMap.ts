import type { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_REFRESH,
  cookieOptsMaxAge,
  clearAuthCookie,
} from '@/src/shared/utils/authCookies'

/** Mapa httpOnly: refresh token por empresa. */
export const AUTH_COOKIE_REFRESH_MAP = 'refresh-token-map'

const MAX_EMPRESAS_NO_MAPA = 12

export type RefreshTokenMap = Record<string, string>

export function readRefreshTokenMap(request: NextRequest): RefreshTokenMap {
  const raw = request.cookies.get(AUTH_COOKIE_REFRESH_MAP)?.value
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: RefreshTokenMap = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === 'string' && typeof v === 'string' && k.length > 0 && v.length > 0) {
        out[k] = v
      }
    }
    return out
  } catch {
    return {}
  }
}

/**
 * Upsert do refresh da empresa + cookie legado `refresh-token` (última / ponte do hub).
 * Limita o mapa para caber no cookie (~4KB).
 */
export function applyRefreshTokenMap(
  response: NextResponse,
  map: RefreshTokenMap,
  lastEmpresaId: string | null,
  lastRefreshToken: string,
  maxAgeSeconds: number
): void {
  const next: RefreshTokenMap = { ...map }
  if (lastEmpresaId && lastRefreshToken) {
    next[lastEmpresaId] = lastRefreshToken
  }

  const keys = Object.keys(next)
  if (keys.length > MAX_EMPRESAS_NO_MAPA) {
    const drop = keys
      .filter(k => k !== lastEmpresaId)
      .slice(0, keys.length - MAX_EMPRESAS_NO_MAPA)
    for (const k of drop) delete next[k]
  }

  response.cookies.set(
    AUTH_COOKIE_REFRESH_MAP,
    JSON.stringify(next),
    cookieOptsMaxAge(maxAgeSeconds)
  )
  response.cookies.set(AUTH_COOKIE_REFRESH, lastRefreshToken, cookieOptsMaxAge(maxAgeSeconds))
}

export function resolveRefreshTokenForEmpresa(
  request: NextRequest,
  empresaId: string | null | undefined
): string | null {
  const map = readRefreshTokenMap(request)

  // ERP: empresa pedida → só o refresh dessa empresa (sem last-wins).
  if (empresaId) {
    return map[empresaId] ?? null
  }

  // Hub / ponte: sem empresaId → cookie legado last-wins.
  return request.cookies.get(AUTH_COOKIE_REFRESH)?.value ?? null
}

export function clearRefreshTokenMap(response: NextResponse): void {
  clearAuthCookie(response, AUTH_COOKIE_REFRESH_MAP)
  clearAuthCookie(response, AUTH_COOKIE_REFRESH)
}
