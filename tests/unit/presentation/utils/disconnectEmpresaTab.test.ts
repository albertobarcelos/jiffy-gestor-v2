import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Auth } from '@/src/domain/entities/Auth'
import { User } from '@/src/domain/entities/User'
import { HUB_PATH } from '@/src/shared/constants/hubRoutes'

const mockGetState = vi.fn()
const mockEnsure = vi.fn()
const mockRestore = vi.fn()

vi.mock('@/src/presentation/stores/authStore', () => ({
  useAuthStore: {
    getState: () => mockGetState(),
  },
}))

vi.mock('@/src/presentation/utils/restoreIdentityFromCookie', () => ({
  restoreIdentityFromCookie: () => mockRestore(),
}))

vi.mock('@/src/presentation/utils/ensureHubBearerToken', () => ({
  ensureHubBearerToken: () => mockEnsure(),
}))

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn() },
}))

import { disconnectEmpresaTab } from '@/src/presentation/utils/disconnectEmpresaTab'
import toast from 'react-hot-toast'

function makeAuth(expiresInMs: number): Auth {
  return Auth.createWithExpiration(
    't.ok.en',
    User.create('u1', 'a@b.com', 'User'),
    new Date(Date.now() + expiresInMs)
  )
}

describe('disconnectEmpresaTab', () => {
  const logoutTenant = vi.fn()
  const logout = vi.fn()
  const queryClient = { clear: vi.fn() } as unknown as import('@tanstack/react-query').QueryClient
  const assign = vi.fn()
  let previousWindow: unknown

  beforeEach(() => {
    vi.resetAllMocks()
    logoutTenant.mockResolvedValue(undefined)
    logout.mockResolvedValue(undefined)
    mockRestore.mockResolvedValue(false)
    previousWindow = (globalThis as Record<string, unknown>).window
    ;(globalThis as Record<string, unknown>).window = {
      location: { assign },
    }
    ;(globalThis as Record<string, unknown>).sessionStorage = {
      store: {} as Record<string, string>,
      setItem(key: string, value: string) {
        this.store[key] = value
      },
      getItem(key: string) {
        return this.store[key] ?? null
      },
      removeItem(key: string) {
        delete this.store[key]
      },
      clear() {
        this.store = {}
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))
    )
  })

  afterEach(() => {
    ;(globalThis as Record<string, unknown>).window = previousWindow
    vi.unstubAllGlobals()
  })

  it('vai ao hub quando há identity recuperável', async () => {
    mockEnsure.mockResolvedValue({ token: 'id.tok', source: 'identity' })
    mockGetState.mockReturnValue({ identityAuth: makeAuth(60_000) })

    await disconnectEmpresaTab({ queryClient, logoutTenant, logout })

    expect(logoutTenant).toHaveBeenCalled()
    expect(logout).not.toHaveBeenCalled()
    expect(assign).toHaveBeenCalledWith(HUB_PATH)
  })

  it('vai ao hub quando identity morreu mas o refresh/access ainda vale', async () => {
    mockEnsure.mockResolvedValue({ token: 'access.tok', source: 'access' })

    await disconnectEmpresaTab({ queryClient, logoutTenant, logout })

    expect(logoutTenant).toHaveBeenCalled()
    expect(logout).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
    expect(assign).toHaveBeenCalledWith(HUB_PATH)
  })

  it('faz logout completo e vai ao login se não houver identity nem refresh', async () => {
    mockEnsure.mockResolvedValue(null)
    mockGetState.mockReturnValue({ logout })

    await disconnectEmpresaTab({ queryClient, logoutTenant, logout })

    expect(logout).toHaveBeenCalled()
    expect(logoutTenant).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalled()
    expect(assign).toHaveBeenCalledWith('/login')
  })
})
