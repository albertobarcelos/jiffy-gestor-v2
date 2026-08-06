import { describe, it, expect } from 'vitest'
import type { NextRequest } from 'next/server'
import {
  AUTH_COOKIE_REFRESH_MAP,
  readRefreshTokenMap,
  resolveRefreshTokenForEmpresa,
} from '@/src/shared/utils/refreshTokenMap'
import { AUTH_COOKIE_REFRESH } from '@/src/shared/utils/authCookies'

function mockRequest(cookies: Record<string, string>): NextRequest {
  return {
    cookies: {
      get: (name: string) => {
        const value = cookies[name]
        return value !== undefined ? { name, value } : undefined
      },
    },
  } as unknown as NextRequest
}

describe('refreshTokenMap', () => {
  it('lê mapa válido do cookie', () => {
    const map = { 'emp-a': 'refresh-a', 'emp-b': 'refresh-b' }
    const req = mockRequest({ [AUTH_COOKIE_REFRESH_MAP]: JSON.stringify(map) })
    expect(readRefreshTokenMap(req)).toEqual(map)
  })

  it('resolve refresh da empresa pedida no mapa', () => {
    const req = mockRequest({
      [AUTH_COOKIE_REFRESH_MAP]: JSON.stringify({ 'emp-a': 'refresh-a', 'emp-b': 'refresh-b' }),
      [AUTH_COOKIE_REFRESH]: 'refresh-last',
    })
    expect(resolveRefreshTokenForEmpresa(req, 'emp-b')).toBe('refresh-b')
  })

  it('com empresaId: NÃO usa cookie legado se a empresa não está no mapa', () => {
    const req = mockRequest({
      [AUTH_COOKIE_REFRESH_MAP]: JSON.stringify({ 'emp-a': 'refresh-a' }),
      [AUTH_COOKIE_REFRESH]: 'refresh-last',
    })
    expect(resolveRefreshTokenForEmpresa(req, 'emp-x')).toBeNull()
  })

  it('sem empresaId: usa cookie legado (ponte do hub)', () => {
    const req = mockRequest({
      [AUTH_COOKIE_REFRESH_MAP]: JSON.stringify({ 'emp-a': 'refresh-a' }),
      [AUTH_COOKIE_REFRESH]: 'refresh-last',
    })
    expect(resolveRefreshTokenForEmpresa(req, null)).toBe('refresh-last')
    expect(resolveRefreshTokenForEmpresa(req, undefined)).toBe('refresh-last')
  })

  it('ignora JSON inválido no mapa', () => {
    const req = mockRequest({
      [AUTH_COOKIE_REFRESH_MAP]: '{broken',
      [AUTH_COOKIE_REFRESH]: 'refresh-last',
    })
    expect(readRefreshTokenMap(req)).toEqual({})
    expect(resolveRefreshTokenForEmpresa(req, null)).toBe('refresh-last')
    expect(resolveRefreshTokenForEmpresa(req, 'emp-a')).toBeNull()
  })
})
