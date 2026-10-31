import { describe, expect, it } from 'vitest'
import {
  createPizzaComplementoSchema,
  replacePizzaComplementoPrecosSchema,
} from '@/src/application/dto/pizza/PizzaInputSchemas'

describe('schemas de adicionais de pizza', () => {
  it('aceita preços gratuitos e tamanhos diferentes no vínculo', () => {
    const result = createPizzaComplementoSchema.safeParse({
      categoriaPizzaId: 'categoria-1',
      complementoId: 'complemento-1',
      precos: [
        { pizzaTamanhoId: 'tamanho-1', valor: 0 },
        { pizzaTamanhoId: 'tamanho-2', valor: 2.5 },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('rejeita tamanhos duplicados ao criar ou substituir preços', () => {
    const precos = [
      { pizzaTamanhoId: 'tamanho-1', valor: 1 },
      { pizzaTamanhoId: 'tamanho-1', valor: 2 },
    ]

    expect(
      createPizzaComplementoSchema.safeParse({
        categoriaPizzaId: 'categoria-1',
        complementoId: 'complemento-1',
        precos,
      }).success
    ).toBe(false)
    expect(replacePizzaComplementoPrecosSchema.safeParse({ precos }).success).toBe(false)
  })

  it('exige ao menos um tamanho precificado', () => {
    expect(
      replacePizzaComplementoPrecosSchema.safeParse({ precos: [] }).success
    ).toBe(false)
  })
})
