import { describe, expect, it } from 'vitest'
import { parseSlugsPublicos } from '@/src/infrastructure/seo/parseSlugsPublicos'

describe('parseSlugsPublicos', () => {
  it('le { slugs } do backend', () => {
    expect(parseSlugsPublicos({ slugs: ['Nexsyn', 'outra-loja', 'nexsyn'] })).toEqual(
      ['nexsyn', 'outra-loja']
    )
  })

  it('aceita array e objetos { slug }', () => {
    expect(parseSlugsPublicos([{ slug: 'loja-a' }, 'loja-b'])).toEqual([
      'loja-a',
      'loja-b',
    ])
  })

  it('ignora robots.txt e corpo invalido', () => {
    expect(parseSlugsPublicos({ slugs: ['robots.txt', 'nexsyn'] })).toEqual(['nexsyn'])
    expect(parseSlugsPublicos(null)).toEqual([])
    expect(parseSlugsPublicos({ ok: true })).toEqual([])
  })
})
