import { describe, expect, it } from 'vitest'
import { marcarItemCompletaConferencia } from '@/src/application/expedicao/marcarItemCompletaConferencia'

describe('marcarItemCompletaConferencia', () => {
  it('completa ao marcar o último item que faltava', () => {
    expect(
      marcarItemCompletaConferencia({
        itemIds: ['a', 'b'],
        marcados: { a: true },
        itemId: 'b',
      })
    ).toBe(true)
  })

  it('não completa se ainda falta outro item ou se está desmarcando', () => {
    expect(
      marcarItemCompletaConferencia({
        itemIds: ['a', 'b'],
        marcados: {},
        itemId: 'a',
      })
    ).toBe(false)
    expect(
      marcarItemCompletaConferencia({
        itemIds: ['a'],
        marcados: { a: true },
        itemId: 'a',
      })
    ).toBe(false)
  })
})
