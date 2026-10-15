import { describe, expect, it } from 'vitest'
import {
  filtrarLinhasParaAtivoAlvo,
  partirEmLotes,
  valorComplementoNoModo,
} from '@/src/application/complementos/valorComplementoLote'

describe('valorComplementoNoModo', () => {
  it('alterar grava o valor digitado', () => {
    expect(valorComplementoNoModo(10, 2, 'alterar')).toBe(2)
    expect(valorComplementoNoModo(0, 0, 'alterar')).toBe(0)
  })

  it('acrescentar soma ao valor atual', () => {
    expect(valorComplementoNoModo(5, 2, 'acrescentar')).toBe(7)
    expect(valorComplementoNoModo(10.1, 0.2, 'acrescentar')).toBe(10.3)
  })

  it('diminuir subtrai e não fica negativo', () => {
    expect(valorComplementoNoModo(10, 2, 'diminuir')).toBe(8)
    expect(valorComplementoNoModo(1, 5, 'diminuir')).toBe(0)
    expect(valorComplementoNoModo(0.1, 0.2, 'diminuir')).toBe(0)
  })
})

describe('filtrarLinhasParaAtivoAlvo', () => {
  const linhas = [
    { chave: 'a', ativoAtual: true },
    { chave: 'b', ativoAtual: false },
    { chave: 'c', ativoAtual: true },
  ]

  it('ao pausar, só inclui quem ainda está ativo', () => {
    expect(filtrarLinhasParaAtivoAlvo(linhas, false).map(item => item.chave)).toEqual(['a', 'c'])
  })

  it('ao ativar, só inclui quem ainda está pausado', () => {
    expect(filtrarLinhasParaAtivoAlvo(linhas, true).map(item => item.chave)).toEqual(['b'])
  })

  it('retorna vazio quando todos já estão no estado alvo', () => {
    expect(filtrarLinhasParaAtivoAlvo([{ chave: 'x', ativoAtual: false }], false)).toEqual([])
  })
})

describe('partirEmLotes', () => {
  it('parte a lista no tamanho informado', () => {
    expect(partirEmLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('lista vazia vira nenhum lote', () => {
    expect(partirEmLotes([], 100)).toEqual([])
  })
})
