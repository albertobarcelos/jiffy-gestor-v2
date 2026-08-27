import { describe, expect, it } from 'vitest'
import {
  buildCreateCompletoPayload,
  createDefaultPizzaCategoriaDraft,
} from '@/src/presentation/components/features/pizza/pizzaDefaults'

describe('buildCreateCompletoPayload', () => {
  it('monta payload completo sem sabores', () => {
    const draft = createDefaultPizzaCategoriaDraft('PIZZAS TRADICIONAIS')
    const payload = buildCreateCompletoPayload(draft)

    expect(payload.nome).toBe('PIZZAS TRADICIONAIS')
    expect(payload.sabores).toEqual([])
    expect(payload.tamanhos?.length).toBeGreaterThan(0)
    expect(payload.gruposMassas?.[0]?.massas?.[0]?.nome).toBe('TRADICIONAL')
    expect(payload.gruposBordas?.[0]?.bordas?.[0]?.nome).toBe('TRADICIONAL')
    expect(payload.config?.regraPrecoMultiplosSabores).toBe('proporcional')
  })

  it('ignora tamanhos inativos ou sem nome', () => {
    const draft = createDefaultPizzaCategoriaDraft('TESTE')
    draft.tamanhos = [
      {
        localId: '1',
        nome: '',
        quantidadePedacos: 8,
        quantidadeMaximaDivisoes: 2,
        ativo: true,
      },
      {
        localId: '2',
        nome: 'GRANDE',
        quantidadePedacos: 8,
        quantidadeMaximaDivisoes: 2,
        ativo: true,
      },
    ]

    const payload = buildCreateCompletoPayload(draft)
    expect(payload.tamanhos).toHaveLength(1)
    expect(payload.tamanhos?.[0]?.nome).toBe('GRANDE')
  })
})
