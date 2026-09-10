import { describe, expect, it } from 'vitest'
import { buildCarrinhoThumbsFromItens } from '@/src/presentation/components/features/delivery-publico/shared/utils/buildCarrinhoThumbsFromItens'

describe('buildCarrinhoThumbsFromItens', () => {
  it('coloca o produto relançado à direita', () => {
    const thumbs = buildCarrinhoThumbsFromItens([
      {
        produtoId: 'lanche',
        produtoImagemUrl: '/lanche.jpg',
        quantidade: 1,
        adicionadoEm: '2026-01-01T10:00:00.000Z',
      },
      {
        produtoId: 'coca',
        produtoImagemUrl: '/coca.jpg',
        quantidade: 1,
        adicionadoEm: '2026-01-01T10:01:00.000Z',
      },
      {
        produtoId: 'lanche',
        produtoImagemUrl: '/lanche.jpg',
        quantidade: 1,
        adicionadoEm: '2026-01-01T10:02:00.000Z',
      },
    ])

    expect(thumbs.map(t => t.produtoId)).toEqual(['coca', 'lanche'])
    expect(thumbs.find(t => t.produtoId === 'lanche')?.quantidade).toBe(2)
  })

  it('mantém ordem de primeiro lançamento quando não há relançamento', () => {
    const thumbs = buildCarrinhoThumbsFromItens([
      {
        produtoId: 'lanche',
        produtoImagemUrl: '/lanche.jpg',
        quantidade: 1,
        adicionadoEm: '2026-01-01T10:00:00.000Z',
      },
      {
        produtoId: 'coca',
        produtoImagemUrl: '/coca.jpg',
        quantidade: 1,
        adicionadoEm: '2026-01-01T10:01:00.000Z',
      },
    ])

    expect(thumbs.map(t => t.produtoId)).toEqual(['lanche', 'coca'])
  })
})
