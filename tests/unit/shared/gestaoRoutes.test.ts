import { describe, it, expect } from 'vitest'
import {
  buildGestaoPath,
  parseEmpresaSlugFromPath,
  parseEmpresaSlugFromSearch,
  stripGestaoEmpresaSlugFromPath,
  isGestaoScopedPath,
} from '@/src/shared/utils/gestaoRoutes'

describe('gestaoRoutes', () => {
  const empresaSlug = 'nexsyn-cmc6u1ef'

  it('monta path com empresaSlug', () => {
    expect(buildGestaoPath(empresaSlug, '/portal-contador')).toBe(
      '/gestao/nexsyn-cmc6u1ef/portal-contador'
    )
  })

  it('extrai empresaSlug do path', () => {
    expect(parseEmpresaSlugFromPath('/gestao/nexsyn-cmc6u1ef/dashboard')).toBe(empresaSlug)
  })

  it('remove prefixo gestao', () => {
    expect(stripGestaoEmpresaSlugFromPath('/gestao/nexsyn-cmc6u1ef/portal-contador')).toBe(
      '/portal-contador'
    )
  })

  it('lê empresaSlug legado da query', () => {
    expect(parseEmpresaSlugFromSearch('?nexsyn-cmc6u1ef')).toBe(empresaSlug)
    expect(parseEmpresaSlugFromSearch('?nexsyn-cmc6u1ef&periodo=7d')).toBe(empresaSlug)
  })

  it('identifica módulos ERP', () => {
    expect(isGestaoScopedPath('/portal-contador')).toBe(true)
    expect(isGestaoScopedPath('/meus-apps')).toBe(false)
  })
})
