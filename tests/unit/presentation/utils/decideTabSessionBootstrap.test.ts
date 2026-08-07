import { describe, it, expect } from 'vitest'
import {
  decideTabSessionBootstrap,
  tokenMatchesUrlEmpresa,
  resolveEmpresaIdFromUrl,
} from '@/src/presentation/utils/decideTabSessionBootstrap'

/** JWT mínimo com claim empresaId (sem assinatura — só decode). */
function jwtEmpresa(empresaId: string): string {
  const payload = Buffer.from(JSON.stringify({ empresaId }), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `eyJhbGciOiJub25lIn0.${payload}.sig`
}

const EMPRESA_A = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const EMPRESA_B = 'f9e8d7c6-b5a4-4938-7261-5043c2b1a0f9'
const SLUG_A = `empresa-a-${EMPRESA_A.replace(/-/g, '').slice(0, 8)}`
const SLUG_B = `empresa-b-${EMPRESA_B.replace(/-/g, '').slice(0, 8)}`

describe('tokenMatchesUrlEmpresa', () => {
  it('aceita token alinhado ao slug da URL', () => {
    expect(tokenMatchesUrlEmpresa(jwtEmpresa(EMPRESA_A), SLUG_A)).toBe(true)
  })

  it('recusa token de outra empresa', () => {
    expect(tokenMatchesUrlEmpresa(jwtEmpresa(EMPRESA_B), SLUG_A)).toBe(false)
  })

  it('sem slug na URL, não bloqueia', () => {
    expect(tokenMatchesUrlEmpresa(jwtEmpresa(EMPRESA_A), null)).toBe(true)
  })
})

describe('resolveEmpresaIdFromUrl', () => {
  it('resolve UUID completo via hubEmpresas pelo prefixo', () => {
    expect(
      resolveEmpresaIdFromUrl(SLUG_A, [{ id: EMPRESA_A }, { id: EMPRESA_B }], null)
    ).toBe(EMPRESA_A)
  })

  it('usa storedEmpresaId quando hub ainda não carregou', () => {
    expect(resolveEmpresaIdFromUrl(SLUG_A, null, EMPRESA_A)).toBe(EMPRESA_A)
  })

  it('recusa storedEmpresaId de outra empresa', () => {
    expect(resolveEmpresaIdFromUrl(SLUG_A, null, EMPRESA_B)).toBeNull()
  })
})

describe('decideTabSessionBootstrap', () => {
  const hub = [{ id: EMPRESA_A }, { id: EMPRESA_B }]

  it('pending do hub → activate', () => {
    const pending = jwtEmpresa(EMPRESA_A)
    expect(
      decideTabSessionBootstrap({
        empParam: SLUG_A,
        pendingToken: pending,
        existingToken: jwtEmpresa(EMPRESA_B),
        hubEmpresas: hub,
      })
    ).toEqual({ type: 'activate', token: pending })
  })

  it('token alinhado à URL → activate (reload)', () => {
    const token = jwtEmpresa(EMPRESA_A)
    expect(
      decideTabSessionBootstrap({
        empParam: SLUG_A,
        pendingToken: null,
        existingToken: token,
        hubEmpresas: hub,
      })
    ).toEqual({ type: 'activate', token })
  })

  it('token diverge da URL → rebind da empresa da URL', () => {
    expect(
      decideTabSessionBootstrap({
        empParam: SLUG_A,
        pendingToken: null,
        existingToken: jwtEmpresa(EMPRESA_B),
        hubEmpresas: hub,
        storedEmpresaId: EMPRESA_B,
      })
    ).toEqual({ type: 'rebind', empresaId: EMPRESA_A, empParam: SLUG_A })
  })

  it('token diverge e não resolve empresa da URL → redirect-hub', () => {
    expect(
      decideTabSessionBootstrap({
        empParam: SLUG_A,
        pendingToken: null,
        existingToken: jwtEmpresa(EMPRESA_B),
        hubEmpresas: [],
        storedEmpresaId: null,
      })
    ).toEqual({ type: 'redirect-hub' })
  })

  it('sem token + URL + hub → rebind', () => {
    expect(
      decideTabSessionBootstrap({
        empParam: SLUG_B,
        pendingToken: null,
        existingToken: null,
        hubEmpresas: hub,
      })
    ).toEqual({ type: 'rebind', empresaId: EMPRESA_B, empParam: SLUG_B })
  })

  it('sem token e hub ainda vazio → wait', () => {
    expect(
      decideTabSessionBootstrap({
        empParam: SLUG_A,
        pendingToken: null,
        existingToken: null,
        hubEmpresas: null,
        storedEmpresaId: EMPRESA_A,
      })
    ).toEqual({ type: 'wait' })
  })
})
