import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
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

async function reordenarCategoria(token: string, id: string, novaPosicao: number) {
  const response = await fetchGestorApi(
    `/api/cardapio/pizza/categorias/${encodeURIComponent(id)}/reordena-categoria`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ novaPosicao }),
    }
  )
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      (errorData as { message?: string }).message || 'Erro ao reordenar categoria pizza'
    )
  }
}

async function reordenarSabor(token: string, id: string, novaPosicao: number) {
  const response = await fetchGestorApi(
    `/api/cardapio/pizza/sabores/${encodeURIComponent(id)}/reordena-sabor`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ novaPosicao }),
    }
  )
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      (errorData as { message?: string }).message || 'Erro ao reordenar sabor de pizza'
    )
  }
}

export class AplicarReordenacaoPizzaUseCase {
  async execute(input: AplicarReordenacaoPizzaInput): Promise<void> {
    const { token } = input

    if (
      input.categorias &&
      hasReorderChanged(input.categorias.initialCategoriaIds, input.categorias.finalCategoriaIds)
    ) {
      await applySequentialReorder(
        input.categorias.initialCategoriaIds,
        input.categorias.finalCategoriaIds,
        (id, novaPosicao) => reordenarCategoria(token, id, novaPosicao)
      )
    }

    for (const grupo of input.saboresPorCategoria ?? []) {
      if (!hasReorderChanged(grupo.initialSaborIds, grupo.finalSaborIds)) continue
      await applySequentialReorder(grupo.initialSaborIds, grupo.finalSaborIds, (id, novaPosicao) =>
        reordenarSabor(token, id, novaPosicao)
      )
    }
  }
}

export const aplicarReordenacaoPizzaUseCase = new AplicarReordenacaoPizzaUseCase()
