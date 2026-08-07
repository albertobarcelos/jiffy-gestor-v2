import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

const mockGetState = vi.fn()
const mockSetTenantAuth = vi.fn()
const mockGetTab = vi.fn()
const mockSetTab = vi.fn()
const mockGetTabEmpresaId = vi.fn()
const mockSetTabEmpresaId = vi.fn()

const _sessionStore = new Map<string, string>()
const _sessionStorageShim = {
  getItem: (key: string) => _sessionStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    _sessionStore.set(key, value)
  },
  removeItem: (key: string) => {
    _sessionStore.delete(key)
  },
  clear: () => {
    _sessionStore.clear()
  },
}

vi.mock('@/src/presentation/stores/authStore', () => ({
  useAuthStore: {
    getState: () => mockGetState(),
  },
}))

vi.mock('@/src/shared/utils/tabSession', () => ({
  getTabTenantToken: () => mockGetTab(),
  setTabTenantToken: (t: string) => mockSetTab(t),
  getTabEmpresaId: () => mockGetTabEmpresaId(),
  setTabEmpresaId: (id: string) => mockSetTabEmpresaId(id),
}))

vi.mock('@/src/shared/utils/buildAuthFromAccessToken', () => ({
  buildAuthFromAccessToken: (token: string) => ({
    getAccessToken: () => token,
    isExpired: () => false,
  }),
}))

vi.mock('@/src/shared/utils/validateToken', () => ({
  extractTokenInfo: (token: string) => {
    if (token.includes('empresa-a')) return { empresaId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }
    if (token.includes('empresa-b')) return { empresaId: 'f9e8d7c6-b5a4-4938-7261-5043c2b1a0f9' }
    return {}
  },
}))

import { syncTenantAccessTokenClient } from '@/src/presentation/utils/syncTenantAccessTokenClient'

const EMPRESA_A_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

describe('syncTenantAccessTokenClient', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: _sessionStorageShim,
      writable: true,
    })
  })

  beforeEach(() => {
    vi.resetAllMocks()
    _sessionStore.clear()
    mockGetState.mockReturnValue({
      getUser: () => null,
      tenantAuth: null,
      setTenantAuth: mockSetTenantAuth,
    })
    mockGetTab.mockReturnValue(null)
    mockGetTabEmpresaId.mockReturnValue(null)
  })

  it('sincroniza quando a aba não tem sessão prévia', () => {
    const ok = syncTenantAccessTokenClient('jwt-empresa-a')
    expect(ok).toBe(true)
    expect(mockSetTab).toHaveBeenCalledWith('jwt-empresa-a')
    expect(mockSetTabEmpresaId).toHaveBeenCalledWith(EMPRESA_A_ID)
    expect(mockSetTenantAuth).toHaveBeenCalled()
  })

  it('sincroniza quando o refresh é da mesma empresa (token existente)', () => {
    mockGetTab.mockReturnValue('jwt-empresa-a-old')
    const ok = syncTenantAccessTokenClient('jwt-empresa-a-new')
    expect(ok).toBe(true)
    expect(mockSetTab).toHaveBeenCalledWith('jwt-empresa-a-new')
    expect(mockSetTabEmpresaId).toHaveBeenCalledWith(EMPRESA_A_ID)
  })

  it('recusa sobrescrever com refresh de outra empresa quando token existente', () => {
    mockGetTab.mockReturnValue('jwt-empresa-a')
    const ok = syncTenantAccessTokenClient('jwt-empresa-b')
    expect(ok).toBe(false)
    expect(mockSetTab).not.toHaveBeenCalled()
    expect(mockSetTenantAuth).not.toHaveBeenCalled()
  })

  it('recusa quando UUID canônico não coincide', () => {
    mockGetTab.mockReturnValue(null)
    mockGetTabEmpresaId.mockReturnValue(EMPRESA_A_ID)
    const ok = syncTenantAccessTokenClient('jwt-empresa-b')
    expect(ok).toBe(false)
    expect(mockSetTab).not.toHaveBeenCalled()
    expect(mockSetTenantAuth).not.toHaveBeenCalled()
  })

  it('sincroniza quando UUID canônico coincide', () => {
    mockGetTab.mockReturnValue(null)
    mockGetTabEmpresaId.mockReturnValue(EMPRESA_A_ID)
    const ok = syncTenantAccessTokenClient('jwt-empresa-a')
    expect(ok).toBe(true)
    expect(mockSetTab).toHaveBeenCalledWith('jwt-empresa-a')
    expect(mockSetTabEmpresaId).toHaveBeenCalledWith(EMPRESA_A_ID)
  })

  it('recusa refresh de outra empresa quando só há empresaId canônico (sem token)', () => {
    mockGetTab.mockReturnValue(null)
    mockGetState.mockReturnValue({
      getUser: () => null,
      tenantAuth: null,
      setTenantAuth: mockSetTenantAuth,
    })
    mockGetTabEmpresaId.mockReturnValue(EMPRESA_A_ID)
    expect(syncTenantAccessTokenClient('jwt-empresa-b')).toBe(false)
    expect(mockSetTenantAuth).not.toHaveBeenCalled()
  })
})
