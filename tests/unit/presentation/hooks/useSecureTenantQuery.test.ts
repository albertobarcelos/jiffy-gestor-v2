import { describe, it, expect } from 'vitest'
import { buildTenantQueryKey } from '@/src/presentation/hooks/useInvalidateTenantQueries'

/**
 * Lógica de `securityEnabled` extraída diretamente do hook para ser testada
 * como função pura — espelha exatamente o que `useSecureTenantQuery` computa.
 */
function computeSecurityEnabled(params: {
  isRehydrated: boolean
  isAuthenticated: boolean
  token: string | null
  empresaId: string | null
  isExpired: boolean
}): boolean {
  const { isRehydrated, isAuthenticated, token, empresaId, isExpired } = params
  return isRehydrated && isAuthenticated && !!token && !!empresaId && !isExpired
}

describe('useSecureTenantQuery — buildTenantQueryKey', () => {
  it('prefixa a key com ["tenant", empresaId, ...]', () => {
    const result = buildTenantQueryKey('empresa-abc', ['produtos'])
    expect(result).toEqual(['tenant', 'empresa-abc', 'produtos'])
  })

  it('inclui múltiplos segmentos no base key', () => {
    const result = buildTenantQueryKey('empresa-abc', ['venda', '123'])
    expect(result).toEqual(['tenant', 'empresa-abc', 'venda', '123'])
  })

  it('aceita empresaId null (sessão sem empresa)', () => {
    const result = buildTenantQueryKey(null, ['produtos'])
    expect(result).toEqual(['tenant', null, 'produtos'])
  })

  it('preserva objetos no base key', () => {
    const result = buildTenantQueryKey('emp-1', ['produtos', { page: 2, limit: 20 }])
    expect(result).toEqual(['tenant', 'emp-1', 'produtos', { page: 2, limit: 20 }])
  })
})

describe('useSecureTenantQuery — securityEnabled', () => {
  const validSession = {
    isRehydrated: true,
    isAuthenticated: true,
    token: 'eyJhbGci.token.valido',
    empresaId: 'empresa-abc',
    isExpired: false,
  }

  it('retorna true com sessão totalmente válida', () => {
    expect(computeSecurityEnabled(validSession)).toBe(true)
  })

  it('retorna false quando não rehydrated ainda (app inicializando)', () => {
    expect(computeSecurityEnabled({ ...validSession, isRehydrated: false })).toBe(false)
  })

  it('retorna false quando não autenticado', () => {
    expect(computeSecurityEnabled({ ...validSession, isAuthenticated: false })).toBe(false)
  })

  it('retorna false quando token é null', () => {
    expect(computeSecurityEnabled({ ...validSession, token: null })).toBe(false)
  })

  it('retorna false quando empresaId é null (sem sessão de empresa)', () => {
    expect(computeSecurityEnabled({ ...validSession, empresaId: null })).toBe(false)
  })

  it('retorna false quando o token está expirado', () => {
    expect(computeSecurityEnabled({ ...validSession, isExpired: true })).toBe(false)
  })

  it('retorna false com token vazio (string vazia não é truthy)', () => {
    expect(computeSecurityEnabled({ ...validSession, token: '' })).toBe(false)
  })

  it('retorna false com empresaId vazio', () => {
    expect(computeSecurityEnabled({ ...validSession, empresaId: '' })).toBe(false)
  })
})
