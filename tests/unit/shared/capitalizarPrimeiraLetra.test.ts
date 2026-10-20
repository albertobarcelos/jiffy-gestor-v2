import { describe, expect, it } from 'vitest'
import { capitalizarPrimeiraLetra } from '@/src/shared/utils/capitalizarPrimeiraLetra'

describe('capitalizarPrimeiraLetra', () => {
  it('sobe só a primeira letra visível', () => {
    expect(capitalizarPrimeiraLetra('joão silva')).toBe('João silva')
    expect(capitalizarPrimeiraLetra('alberto')).toBe('Alberto')
  })

  it('preserva espaços à esquerda e o restante do texto', () => {
    expect(capitalizarPrimeiraLetra('  maria')).toBe('  Maria')
    expect(capitalizarPrimeiraLetra('')).toBe('')
    expect(capitalizarPrimeiraLetra('   ')).toBe('   ')
  })
})
