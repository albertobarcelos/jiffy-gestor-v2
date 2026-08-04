import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Auth } from '@/src/domain/entities/Auth'
import { User } from '@/src/domain/entities/User'

const mockGetState = vi.fn()
const mockSetState = vi.fn()

vi.mock('@/src/presentation/stores/authStore', () => ({
  useAuthStore: {
    getState: () => mockGetState(),
    setState: (...args: unknown[]) => mockSetState(...args),
  },
}))

import { restoreIdentityFromCookie } from '@/src/presentation/utils/restoreIdentityFromCookie'

function makeAuth(expiresInMs: number): Auth {
  const user = User.create('u1', 'a@b.com', 'User')
  return Auth.createWithExpiration(
    'header.payload.sig',
    user,
    new Date(Date.now() + expiresInMs)
  )
}

/** JWT mínimo com exp futuro (buildAuthFromAccessToken usa decodeToken). */
function makeJwt(expSec: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'u1',
      userId: 'u1',
      email: 'a@b.com',
      name: 'User',
      exp: expSec,
    })
  ).toString('base64url')
  return `${header}.${payload}.x`
}

describe('restoreIdentityFromCookie', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.resetAllMocks()
    mockSetState.mockImplementation(() => undefined)
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('retorna true se identityAuth em memória ainda é válido', async () => {
    mockGetState.mockReturnValue({ identityAuth: makeAuth(60_000) })
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    await expect(restoreIdentityFromCookie()).resolves.toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reidrata a partir do cookie quando memória está vazia', async () => {
    mockGetState.mockReturnValue({ identityAuth: null, tenantAuth: null })
    const token = makeJwt(Math.floor(Date.now() / 1000) + 3600)
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: token }), { status: 200 })
    ) as unknown as typeof fetch

    await expect(restoreIdentityFromCookie()).resolves.toBe(true)
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/auth/identity-session', {
      method: 'GET',
      credentials: 'include',
    })
    expect(mockSetState).toHaveBeenCalled()
  })

  it('retorna false quando o cookie/sessão não existe', async () => {
    mockGetState.mockReturnValue({ identityAuth: null })
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Identidade não encontrada' }), { status: 401 })
    ) as unknown as typeof fetch

    await expect(restoreIdentityFromCookie()).resolves.toBe(false)
    expect(mockSetState).not.toHaveBeenCalled()
  })

  it('retorna false se identityAuth em memória já expirou e cookie falha', async () => {
    mockGetState.mockReturnValue({ identityAuth: makeAuth(-60_000) })
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('{}', { status: 401 })
    ) as unknown as typeof fetch

    await expect(restoreIdentityFromCookie()).resolves.toBe(false)
  })
})
