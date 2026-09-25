import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CATALOGO_PUBLICO_REVALIDATE_SECONDS,
  catalogoPublicoCacheControl,
  catalogoPublicoCacheTag,
} from '@/src/infrastructure/cache/catalogoPublicoCache'
import { generateStaticParams } from '@/app/[slug]/catalogoSlugCache'

const appRoot = resolve(__dirname, '../../../../app')

describe('catalogoPublicoCache', () => {
  it('isola a tag por slug (200 lojas nao compartilham cache)', () => {
    expect(catalogoPublicoCacheTag('nexsyn')).toBe('catalogo-publico:nexsyn')
    expect(catalogoPublicoCacheTag('outra-loja')).toBe('catalogo-publico:outra-loja')
    expect(catalogoPublicoCacheTag(' nexsyn ')).toBe('catalogo-publico:nexsyn')
  })

  it('expõe s-maxage alinhado ao ISR de 30s', () => {
    expect(CATALOGO_PUBLICO_REVALIDATE_SECONDS).toBe(30)
    expect(catalogoPublicoCacheControl()).toBe(
      'public, s-maxage=30, stale-while-revalidate=60'
    )
  })

  it('nao pre-renderiza slugs no build', () => {
    expect(generateStaticParams()).toEqual([])
  })

  it('page.tsx declara revalidate 30 no arquivo (Next nao le re-export)', () => {
    const home = readFileSync(resolve(appRoot, '[slug]/page.tsx'), 'utf8')
    const carrinho = readFileSync(resolve(appRoot, '[slug]/carrinho/page.tsx'), 'utf8')
    expect(home).toMatch(/export const revalidate = 30/)
    expect(home).toMatch(/export const dynamicParams = true/)
    expect(home).not.toMatch(/export \{[^}]*revalidate/)
    expect(carrinho).toMatch(/export const revalidate = 30/)
    expect(carrinho).toMatch(/export const dynamicParams = true/)
    expect(carrinho).not.toMatch(/export \{[^}]*revalidate/)
  })
})
