import { describe, expect, it } from 'vitest'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'

describe('GrupoComplemento.withImagemUrl', () => {
  const base = GrupoComplemento.create('g1', 'Extras', 0, 3, true)

  it('grava URL persistida sem alterar os demais campos', () => {
    const next = base.withImagemUrl(' https://cdn/g.jpg ')
    expect(next).not.toBe(base)
    expect(next.getId()).toBe('g1')
    expect(next.getNome()).toBe('Extras')
    expect(next.getQtdMaxima()).toBe(3)
    expect(next.getImagemUrl()).toBe('https://cdn/g.jpg')
  })

  it('mesma URL → mesma instância', () => {
    const withUrl = base.withImagemUrl('https://cdn/g.jpg')
    expect(withUrl.withImagemUrl('https://cdn/g.jpg')).toBe(withUrl)
  })
})
