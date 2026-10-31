import type {
  ReordenarPizzaCategoriaViaBffUseCase,
  ReordenarPizzaSaborViaBffUseCase,
} from '@/src/application/use-cases/pizza/pizzaBffUseCases'
import {
  applySequentialReorder,
  hasReorderChanged,
} from '@/src/shared/utils/computeReorderPatches'

export type PizzaReorderCategoriasInput = {
  initialCategoriaIds: readonly string[]
  finalCategoriaIds: readonly string[]
}

export type PizzaReorderSaboresInput = {
  categoriaPizzaId: string
  initialSaborIds: readonly string[]
  finalSaborIds: readonly string[]
}

export type AplicarReordenacaoPizzaInput = {
  token: string
  categorias?: PizzaReorderCategoriasInput
  saboresPorCategoria?: PizzaReorderSaboresInput[]
}

export class AplicarReordenacaoPizzaUseCase {
  constructor(
    private readonly reordenarCategoriaUseCase: ReordenarPizzaCategoriaViaBffUseCase,
    private readonly reordenarSaborUseCase: ReordenarPizzaSaborViaBffUseCase
  ) {}

  async execute(input: AplicarReordenacaoPizzaInput): Promise<void> {
    const { token } = input

    if (
      input.categorias &&
      hasReorderChanged(input.categorias.initialCategoriaIds, input.categorias.finalCategoriaIds)
    ) {
      await applySequentialReorder(
        input.categorias.initialCategoriaIds,
        input.categorias.finalCategoriaIds,
        async (categoriaId, novaPosicao) => {
          await this.reordenarCategoriaUseCase.execute({ token, categoriaId, novaPosicao })
        }
      )
    }

    for (const grupo of input.saboresPorCategoria ?? []) {
      if (!hasReorderChanged(grupo.initialSaborIds, grupo.finalSaborIds)) continue
      await applySequentialReorder(
        grupo.initialSaborIds,
        grupo.finalSaborIds,
        async (id, novaPosicao) => {
          await this.reordenarSaborUseCase.execute({ token, saborId: id, novaPosicao })
        }
      )
    }
  }
}
