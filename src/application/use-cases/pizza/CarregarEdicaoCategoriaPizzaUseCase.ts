import type { IPizzaCadastroGateway } from '@/src/application/ports/IPizzaCadastroGateway'
import {
  buildEditDraftFromLoaded,
  type PizzaCategoriaEditDraft,
} from '@/src/application/mappers/pizza/pizzaEditMappers'

export class CarregarEdicaoCategoriaPizzaUseCase {
  constructor(private readonly pizzaGateway: IPizzaCadastroGateway) {}

  async execute(input: { token: string; categoriaId: string }): Promise<PizzaCategoriaEditDraft> {
    const { token, categoriaId } = input
    const categoria = await this.pizzaGateway.buscarCategoria(token, categoriaId)
    const tamanhos = await this.pizzaGateway.listarTamanhos(token, {
      categoriaPizzaId: categoriaId,
      limit: 50,
      offset: 0,
    })

    const gruposMassasSummary = await this.pizzaGateway.listarGruposMassas(token, {
      categoriaPizzaId: categoriaId,
      limit: 10,
      offset: 0,
    })
    const gruposBordasSummary = await this.pizzaGateway.listarGruposBordas(token, {
      categoriaPizzaId: categoriaId,
      limit: 10,
      offset: 0,
    })

    const grupoMassas = gruposMassasSummary.items[0]?.id
      ? await this.pizzaGateway.buscarGrupoMassas(token, gruposMassasSummary.items[0].id)
      : null
    const grupoBordas = gruposBordasSummary.items[0]?.id
      ? await this.pizzaGateway.buscarGrupoBordas(token, gruposBordasSummary.items[0].id)
      : null

    return buildEditDraftFromLoaded({
      categoria,
      tamanhos: tamanhos.items,
      grupoMassas,
      grupoBordas,
    })
  }
}
