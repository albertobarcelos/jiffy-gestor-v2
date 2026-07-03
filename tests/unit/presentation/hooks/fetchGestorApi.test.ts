import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---- mocks de módulos ---------------------------------------------------

const mockGetState = vi.fn()

vi.mock('@/src/presentation/stores/authStore', () => ({
  useAuthStore: Object.assign(
    () => ({}),
    { getState: () => mockGetState() }
  ),
}))

vi.mock('@/src/shared/utils/fetchTenantRefreshAccessToken', () => ({
  fetchTenantRefreshAccessToken: vi.fn(),
}))

vi.mock('@/src/presentation/utils/syncTenantAccessTokenClient', () => ({
  syncTenantAccessTokenClient: vi.fn(),
}))

vi.mock('@/src/shared/constants/sessionCoordinator', () => ({
  JIFFY_SESSION_EXPIRED_EVENT: 'jiffy-session-expired',
}))

import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { fetchTenantRefreshAccessToken } from '@/src/shared/utils/fetchTenantRefreshAccessToken'
import { syncTenantAccessTokenClient } from '@/src/presentation/utils/syncTenantAccessTokenClient'

// -------------------------------------------------------------------------

function makeOkResponse(body = {}): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

function make401Response(): Response {
  return new Response('Unauthorized', { status: 401 })
}

/**
 * Simula window para que o branch de retry dentro de fetchGestorApi seja
 * executável no ambiente node do vitest. O hook verifica `typeof window === 'undefined'`
 * para evitar retry em server-side rendering.
 */
function withBrowserWindow(fn: () => Promise<void>): Promise<void> {
  const originalWindow = (globalThis as Record<string, unknown>).window
  ;(globalThis as Record<string, unknown>).window = {
    location: { pathname: '/dashboard' },
    dispatchEvent: vi.fn(),
  }
  return fn().finally(() => {
    ;(globalThis as Record<string, unknown>).window = originalWindow
  })
}

// -------------------------------------------------------------------------

describe('fetchGestorApi', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetState.mockReturnValue({ tenantAuth: null })
    vi.mocked(fetchTenantRefreshAccessToken).mockResolvedValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // -----------------------------------------------------------------------
  // Injeção de Authorization
  // -----------------------------------------------------------------------

  it('injeta Authorization: Bearer quando o chamador não fornece header e há token no store', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse())

    mockGetState.mockReturnValue({
      tenantAuth: { getAccessToken: () => 'token-da-aba' },
    })

    await fetchGestorApi('/api/produtos')

    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init?.headers)
    expect(headers.get('authorization')).toBe('Bearer token-da-aba')
  })

  it('não substitui Authorization quando o chamador já fornece o header', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse())

    mockGetState.mockReturnValue({
      tenantAuth: { getAccessToken: () => 'token-store' },
    })

    await fetchGestorApi('/api/produtos', {
      headers: { Authorization: 'Bearer token-caller' },
    })

    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init?.headers)
    expect(headers.get('authorization')).toBe('Bearer token-caller')
  })

  it('não injeta Authorization quando não há token no store e chamador também não fornece', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse())

    mockGetState.mockReturnValue({ tenantAuth: null })

    await fetchGestorApi('/api/produtos')

    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init?.headers)
    expect(headers.get('authorization')).toBeNull()
  })

  // -----------------------------------------------------------------------
  // Retry em 401
  // -----------------------------------------------------------------------

  it('tenta refresh e repete o pedido em 401 para rotas /api/', async () => {
    await withBrowserWindow(async () => {
      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(make401Response())
        .mockResolvedValueOnce(makeOkResponse())

      vi.mocked(fetchTenantRefreshAccessToken).mockResolvedValue('novo-token')
      vi.mocked(syncTenantAccessTokenClient).mockImplementation(() => {})

      mockGetState.mockReturnValue({ tenantAuth: null })

      const result = await fetchGestorApi('/api/produtos')

      expect(fetchTenantRefreshAccessToken).toHaveBeenCalledTimes(1)
      expect(syncTenantAccessTokenClient).toHaveBeenCalledWith('novo-token')
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.status).toBe(200)

      // No retry, o novo token é usado no header
      const [, retryInit] = mockFetch.mock.calls[1]
      const retryHeaders = new Headers(retryInit?.headers)
      expect(retryHeaders.get('authorization')).toBe('Bearer novo-token')
    })
  })

  it('retorna 401 original quando refresh falha (sem novo token)', async () => {
    await withBrowserWindow(async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(make401Response())
      vi.mocked(fetchTenantRefreshAccessToken).mockResolvedValue(null)
      mockGetState.mockReturnValue({ tenantAuth: null })

      const result = await fetchGestorApi('/api/produtos')

      expect(result.status).toBe(401)
    })
  })

  it('não tenta refresh em 401 para /api/auth/refresh-token (evitar loop)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(make401Response())

    const result = await fetchGestorApi('/api/auth/refresh-token')

    expect(fetchTenantRefreshAccessToken).not.toHaveBeenCalled()
    expect(result.status).toBe(401)
  })

  it('não tenta refresh em 401 quando autoRefresh=false', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(make401Response())

    const result = await fetchGestorApi('/api/produtos', { autoRefresh: false })

    expect(fetchTenantRefreshAccessToken).not.toHaveBeenCalled()
    expect(result.status).toBe(401)
  })
})
