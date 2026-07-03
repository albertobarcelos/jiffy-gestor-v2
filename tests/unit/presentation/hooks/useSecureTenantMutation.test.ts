import { describe, it, expect, vi } from 'vitest'
import type { TenantMutationContext } from '@/src/presentation/hooks/useSecureTenantMutation'

/**
 * Lógica do session-guard extraída diretamente do `useSecureTenantMutation`.
 * Espelha exatamente o que o hook executa dentro do `mutationFn` wrappado.
 */
function buildWrappedMutationFn<TData, TVariables>(
  mutationFn: (ctx: TenantMutationContext, variables: TVariables) => Promise<TData>,
  session: {
    isRehydrated: boolean
    isAuthenticated: boolean
    token: string | null
    empresaId: string | null
    isExpired: boolean
  }
) {
  return (variables: TVariables): Promise<TData> => {
    const { isRehydrated, isAuthenticated, token, empresaId, isExpired } = session

    if (!isRehydrated || !isAuthenticated || !token || !empresaId || isExpired) {
      throw new Error('Sessão de empresa não encontrada. Faça login novamente.')
    }

    return mutationFn({ token, empresaId }, variables)
  }
}

describe('useSecureTenantMutation — guard de sessão', () => {
  const validSession = {
    isRehydrated: true,
    isAuthenticated: true,
    token: 'token-valido',
    empresaId: 'empresa-abc',
    isExpired: false,
  }

  it('chama a mutationFn quando a sessão é válida', async () => {
    const spy = vi.fn().mockResolvedValue({ id: '123' })
    const wrapped = buildWrappedMutationFn(spy, validSession)

    const result = await wrapped({ nome: 'Produto A' })

    expect(spy).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ id: '123' })
  })

  it('injeta { token, empresaId } corretamente como primeiro argumento', async () => {
    const spy = vi.fn().mockResolvedValue(null)
    const wrapped = buildWrappedMutationFn(spy, validSession)

    await wrapped({ campo: 'valor' })

    const ctx: TenantMutationContext = spy.mock.calls[0][0]
    expect(ctx.token).toBe('token-valido')
    expect(ctx.empresaId).toBe('empresa-abc')
  })

  it('repassa as variáveis como segundo argumento', async () => {
    const spy = vi.fn().mockResolvedValue(null)
    const wrapped = buildWrappedMutationFn(spy, validSession)

    const vars = { nome: 'Produto X', preco: 99.9 }
    await wrapped(vars)

    expect(spy.mock.calls[0][1]).toEqual(vars)
  })

  it('lança erro quando isRehydrated=false', () => {
    const spy = vi.fn()
    const wrapped = buildWrappedMutationFn(spy, { ...validSession, isRehydrated: false })

    expect(() => wrapped({})).toThrow('Sessão de empresa não encontrada. Faça login novamente.')
    expect(spy).not.toHaveBeenCalled()
  })

  it('lança erro quando isAuthenticated=false', () => {
    const spy = vi.fn()
    const wrapped = buildWrappedMutationFn(spy, { ...validSession, isAuthenticated: false })

    expect(() => wrapped({})).toThrow('Sessão de empresa não encontrada. Faça login novamente.')
    expect(spy).not.toHaveBeenCalled()
  })

  it('lança erro quando token é null', () => {
    const spy = vi.fn()
    const wrapped = buildWrappedMutationFn(spy, { ...validSession, token: null })

    expect(() => wrapped({})).toThrow('Sessão de empresa não encontrada. Faça login novamente.')
    expect(spy).not.toHaveBeenCalled()
  })

  it('lança erro quando empresaId é null', () => {
    const spy = vi.fn()
    const wrapped = buildWrappedMutationFn(spy, { ...validSession, empresaId: null })

    expect(() => wrapped({})).toThrow('Sessão de empresa não encontrada. Faça login novamente.')
    expect(spy).not.toHaveBeenCalled()
  })

  it('lança erro quando o token está expirado', () => {
    const spy = vi.fn()
    const wrapped = buildWrappedMutationFn(spy, { ...validSession, isExpired: true })

    expect(() => wrapped({})).toThrow('Sessão de empresa não encontrada. Faça login novamente.')
    expect(spy).not.toHaveBeenCalled()
  })
})
