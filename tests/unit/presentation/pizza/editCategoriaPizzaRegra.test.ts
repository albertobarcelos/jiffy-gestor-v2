import { describe, expect, it } from 'vitest'
import { updateCategoriaPizzaSchema } from '@/src/application/dto/pizza/PizzaInputSchemas'
import type { CategoriaPizza } from '@/src/shared/types/pizza'
import {
  buildEditDraftFromLoaded,
  buildUpdateCategoriaPizzaInput,
} from '@/src/presentation/utils/pizza/pizzaEditMappers'

const categoria: CategoriaPizza = {
  id: 'categoria-1',
  nome: 'PIZZAS',
  ordem: 1,
  corHex: '#530CA3',
  iconName: 'pizza',
  regraPrecoMultiplosSabores: 'maior',
  ativoDelivery: true,
  ativoLocal: true,
  ativo: true,
  dataCriacao: '2026-01-01T00:00:00.000Z',
  dataAtualizacao: '2026-01-01T00:00:00.000Z',
}

describe('edição da regra de preço meio a meio', () => {
  it('carrega a regra persistida da categoria no rascunho', () => {
    const draft = buildEditDraftFromLoaded({
      categoria,
      tamanhos: [],
    })

    expect(draft.regraPrecoMultiplosSabores).toBe('maior')
  })

  it('inclui a regra selecionada no payload aceito pelo PATCH de categoria', () => {
    const draft = buildEditDraftFromLoaded({
      categoria,
      tamanhos: [],
    })
    draft.regraPrecoMultiplosSabores = 'proporcional'

    const payload = buildUpdateCategoriaPizzaInput(draft)

    expect(payload.regraPrecoMultiplosSabores).toBe('proporcional')
    expect(updateCategoriaPizzaSchema.safeParse(payload).success).toBe(true)
    expect(
      updateCategoriaPizzaSchema.safeParse({
        regraPrecoMultiplosSabores: 'menor',
      }).success
    ).toBe(false)
  })
})
