import type { IPizzaCadastroGateway } from '@/src/application/ports/IPizzaCadastroGateway'
import {
  buildEditDraftFromLoaded,
  type PizzaCategoriaEditDraft,
} from '@/src/application/mappers/pizza/pizzaEditMappers'
import type { SaborPizza, SaborPizzaSummary } from '@/src/shared/types/pizza'

const PAGE_LIMIT = 100

async function listarTodasPaginas<T>(
  fetchPage: (offset: number, limit: number) => Promise<{ items: T[]; count: number }>
): Promise<T[]> {
  const items: T[] = []
  let offset = 0

  while (true) {
    const page = await fetchPage(offset, PAGE_LIMIT)
    items.push(...page.items)
    const count = Number(page.count ?? items.length)
    offset += page.items.length
    if (page.items.length === 0 || offset >= count) break
  }

  return items
}

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

    const saboresSummary = await listarTodasPaginas<SaborPizzaSummary>((offset, limit) =>
      this.pizzaGateway.listarSabores(token, {
        categoriaPizzaId: categoriaId,
        limit,
        offset,
      })
    )

    const sabores: SaborPizza[] = await Promise.all(
      saboresSummary.map(summary => this.pizzaGateway.buscarSabor(token, summary.id))
    )

    const complementos = await this.pizzaGateway.listarComplementos(token, categoriaId)

    return buildEditDraftFromLoaded({
      categoria,
      tamanhos: tamanhos.items,
      grupoMassas,
      grupoBordas,
      sabores,
      complementos,
    })
  }
}
