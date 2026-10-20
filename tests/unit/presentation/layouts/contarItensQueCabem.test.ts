import { describe, expect, it } from 'vitest'
import { contarItensQueCabem } from '@/src/presentation/layout/contarItensQueCabem'

describe('contarItensQueCabem', () => {
  it('devolve todos quando a soma cabe', () => {
    expect(contarItensQueCabem([80, 90, 100], 300, 80, 4)).toBe(3)
  })

  it('reserva o botão Mais quando o último não cabe', () => {
    expect(contarItensQueCabem([80, 90, 160], 200, 72, 0)).toBe(1)
  })

  it('devolve zero quando nem o primeiro item cabe com Mais', () => {
    expect(contarItensQueCabem([200], 80, 72, 0)).toBe(0)
  })

  it('devolve zero sem largura disponível', () => {
    expect(contarItensQueCabem([80, 90], 0, 72)).toBe(0)
  })
})
