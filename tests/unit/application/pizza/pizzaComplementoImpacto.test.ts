import { describe, expect, it } from 'vitest'
import { buildPizzaComplementoPrecosSelecionados } from '@/src/application/pizza/pizzaComplementoImpacto'

const tamanhos = [
  { id: 't-p', nome: 'PEQUENA' },
  { id: 't-m', nome: 'MEDIA' },
]

describe('buildPizzaComplementoPrecosSelecionados', () => {
  it('rejeita quando nenhum tamanho está selecionado', () => {
    const result = buildPizzaComplementoPrecosSelecionados({
      tamanhos,
      valores: {
        't-p': { ativo: false, valor: 5 },
        't-m': { ativo: false, valor: 8 },
      },
      tipoImpactoPreco: 'aumenta',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/ao menos um tamanho/i)
    }
  })

  it('grava valor 0 em todos os selecionados quando impacto é nenhum', () => {
    const result = buildPizzaComplementoPrecosSelecionados({
      tamanhos,
      valores: {
        't-p': { ativo: true, valor: 5 },
        't-m': { ativo: true, valor: 8 },
      },
      tipoImpactoPreco: 'nenhum',
    })

    expect(result).toEqual({
      ok: true,
      precos: [
        { pizzaTamanhoId: 't-p', valor: 0 },
        { pizzaTamanhoId: 't-m', valor: 0 },
      ],
    })
  })

  it('persiste valores positivos por tamanho quando impacto aumenta', () => {
    const result = buildPizzaComplementoPrecosSelecionados({
      tamanhos,
      valores: {
        't-p': { ativo: true, valor: 3 },
        't-m': { ativo: false, valor: 0 },
      },
      tipoImpactoPreco: 'aumenta',
    })

    expect(result).toEqual({
      ok: true,
      precos: [{ pizzaTamanhoId: 't-p', valor: 3 }],
    })
  })
})
