import {
  reordenarMenuGrupoViaBffUseCase,
  reordenarMenuProdutoViaBffUseCase,
} from '@/src/application/use-cases/menus/menuBffUseCases'
import {
  applySequentialReorder,
  hasReorderChanged,
} from '@/src/shared/utils/computeReorderPatches'

export type MenuReorderCategoriasInput = {
  initialGrupoBaseIds: readonly string[]
  finalGrupoBaseIds: readonly string[]
}

export type MenuReorderProdutosInput = {
  grupoProdutoId: string
  initialProdutoIds: readonly string[]
  finalProdutoIds: readonly string[]
}

export type AplicarReordenacaoMenuInput = {
  token: string
  menuId: string
  categorias?: MenuReorderCategoriasInput
  produtosPorGrupo?: MenuReorderProdutosInput[]
}

export class AplicarReordenacaoMenuUseCase {
  async execute(input: AplicarReordenacaoMenuInput): Promise<void> {
    const { token, menuId } = input

    if (input.categorias && hasReorderChanged(
      input.categorias.initialGrupoBaseIds,
      input.categorias.finalGrupoBaseIds
    )) {
      await applySequentialReorder(
        input.categorias.initialGrupoBaseIds,
        input.categorias.finalGrupoBaseIds,
        (grupoProdutoId, novaPosicao) =>
          reordenarMenuGrupoViaBffUseCase.execute({
            token,
            menuId,
            grupoProdutoId,
            novaPosicao,
          })
      )
    }

    for (const grupo of input.produtosPorGrupo ?? []) {
      if (!hasReorderChanged(grupo.initialProdutoIds, grupo.finalProdutoIds)) continue
      await applySequentialReorder(
        grupo.initialProdutoIds,
        grupo.finalProdutoIds,
        (produtoId, novaPosicao) =>
          reordenarMenuProdutoViaBffUseCase.execute({
            token,
            menuId,
            produtoId,
            novaPosicao,
          })
      )
    }
  }
}

export const aplicarReordenacaoMenuUseCase = new AplicarReordenacaoMenuUseCase()
