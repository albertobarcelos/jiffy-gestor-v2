import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Auth } from '@/src/domain/entities/Auth'
import { User } from '@/src/domain/entities/User'

const mockGetState = vi.fn()
const mockRestore = vi.fn()
const mockRefresh = vi.fn()
const mockSync = vi.fn()
const mockGetTab = vi.fn()

vi.mock('@/src/presentation/stores/authStore', () => ({
  useAuthStore: { getState: () => mockGetState() },
}))

vi.mock('@/src/presentation/utils/restoreIdentityFromCookie', () => ({
  restoreIdentityFromCookie: () => mockRestore(),
}))

vi.mock('@/src/shared/utils/fetchTenantRefreshAccessToken', () => ({
  fetchTenantRefreshAccessToken: () => mockRefresh(),
}))

vi.mock('@/src/presentation/utils/syncTenantAccessTokenClient', () => ({
  syncTenantAccessTokenClient: (t: string) => mockSync(t),
}))

vi.mock('@/src/shared/utils/tabSession', () => ({
  getTabTenantToken: () => mockGetTab(),
}))

vi.mock('@/src/shared/utils/validateToken', async () => {
  const actual = await vi.importActual<typeof import('@/src/shared/utils/validateToken')>(
    '@/src/shared/utils/validateToken'
  )
  return {
    ...actual,
    isTokenExpired: (token: string) => token === 'expired.token',
  }
})

import { ensureHubBearerToken } from '@/src/presentation/utils/ensureHubBearerToken'

function makeAuth(token: string, expiresInMs: number): Auth {
  return Auth.createWithExpiration(
    token,
    User.create('u1', 'a@b.com', 'User'),
    new Date(Date.now() + expiresInMs)
  )
}

describe('ensureHubBearerToken', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRestore.mockResolvedValue(false)
    mockRefresh.mockResolvedValue(null)
    mockGetTab.mockReturnValue(null)
  })

  it('prioriza identity válido', async () => {
    mockGetState.mockReturnValue({
      identityAuth: makeAuth('identity.tok', 60_000),
      tenantAuth: makeAuth('tenant.tok', 60_000),
    })

    const result = await ensureHubBearerToken()
    expect(result).toEqual({ token: 'identity.tok', source: 'identity' })
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('usa access da aba se identity expirou', async () => {
    mockGetState.mockReturnValue({
      identityAuth: makeAuth('old.id', -1_000),
      tenantAuth: makeAuth('tenant.tok', 60_000),
    })

    const result = await ensureHubBearerToken()
    expect(result).toEqual({ token: 'tenant.tok', source: 'access' })
  })

  it('mint via refresh se não houver identity nem access da aba', async () => {
    mockGetState.mockReturnValue({ identityAuth: null, tenantAuth: null })
    mockRefresh.mockResolvedValue('refreshed.tok')

    const result = await ensureHubBearerToken()
    expect(result).toEqual({ token: 'refreshed.tok', source: 'access' })
    expect(mockSync).toHaveBeenCalledWith('refreshed.tok')
  })

  it('retorna null se nada restar', async () => {
    mockGetState.mockReturnValue({ identityAuth: null, tenantAuth: null })
    mockRefresh.mockResolvedValue(null)

    await expect(ensureHubBearerToken()).resolves.toBeNull()
  })
})
