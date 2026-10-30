import type { IPizzaCadastroGateway } from '@/src/application/ports/IPizzaCadastroGateway'
import type { IPizzaMenuVinculoGateway } from '@/src/application/ports/IPizzaMenuVinculoGateway'
import { mapSaborPizzaSummaryToEntity } from '@/src/application/mappers/pizza/pizzaEntityMappers'
import type { MenuProduto } from '@/src/shared/types/menus'
import type { SaborPizzaSummary } from '@/src/shared/types/pizza'

const MENU_PAGE_LIMIT = 100

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))]
}

function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size))
  }
  return chunks
}

async function listarTodasPaginas<T>(
  fetchPage: (offset: number, limit: number) => Promise<{ items: T[]; count: number }>
): Promise<T[]> {
  const items: T[] = []
  let offset = 0

  while (true) {
    const page = await fetchPage(offset, MENU_PAGE_LIMIT)
    items.push(...page.items)

    const count = Number(page.count ?? items.length)
    offset += page.items.length
    if (page.items.length === 0 || offset >= count) break
  }

  return items
}

export class VincularPizzaCategoriaMenusUseCase {
  constructor(
    private readonly pizzaGateway: IPizzaCadastroGateway,
    private readonly menuGateway: IPizzaMenuVinculoGateway
  ) {}

  async listarSaboresAtivosDaCategoria(input: {
    token: string
    categoriaPizzaId: string
  }): Promise<SaborPizzaSummary[]> {
    const items = await listarTodasPaginas<SaborPizzaSummary>((offset, limit) =>
      this.pizzaGateway.listarSabores(input.token, {
        categoriaPizzaId: input.categoriaPizzaId,
        ativo: true,
        limit,
        offset,
      })
    )
    return items.filter(s => mapSaborPizzaSummaryToEntity(s).isAtivo())
  }

  /**
   * Sabores da categoria no menu.
   * Usa `tipo=all` + `grupoProdutoId` (o backend defaulta `padrao` se omitir tipo)
   * e faz fallback varrendo `tipo=pizza` filtrando pelo grupo no cliente.
   */
  async listarSaboresPizzaNoMenu(input: {
    token: string
    menuId: string
    categoriaPizzaId: string
  }): Promise<MenuProduto[]> {
    const porGrupo = await listarTodasPaginas<MenuProduto>((offset, limit) =>
      this.menuGateway.listarProdutos(input.token, input.menuId, {
        grupoProdutoId: input.categoriaPizzaId,
        tipo: 'all',
        limit,
        offset,
      })
    )
    if (porGrupo.length > 0) return porGrupo

    const pizzasNoMenu = await listarTodasPaginas<MenuProduto>((offset, limit) =>
      this.menuGateway.listarProdutos(input.token, input.menuId, {
        tipo: 'pizza',
        limit,
        offset,
      })
    )
    return pizzasNoMenu.filter(p => p.grupoProduto?.id === input.categoriaPizzaId)
  }

  async menuTemPizzaCategoria(input: {
    token: string
    menuId: string
    categoriaPizzaId: string
  }): Promise<boolean> {
    // 1) Snapshot da categoria no cardápio (precisa tipo=all/pizza — default do backend é padrao)
    const grupos = await this.menuGateway.listarGrupos(input.token, input.menuId, {
      grupoProdutoId: input.categoriaPizzaId,
      tipo: 'all',
      limit: 1,
      offset: 0,
    })
    if (Number(grupos.count ?? grupos.items.length) > 0) return true

    // 2) Qualquer produto da categoria no menu
    const porGrupo = await this.menuGateway.listarProdutos(input.token, input.menuId, {
      grupoProdutoId: input.categoriaPizzaId,
      tipo: 'all',
      limit: 1,
      offset: 0,
    })
    if (Number(porGrupo.count ?? porGrupo.items.length) > 0) return true

    // 3) Fallback: pizza no menu cujo grupo bate com a categoria
    const pizzasNoMenu = await listarTodasPaginas<MenuProduto>((offset, limit) =>
      this.menuGateway.listarProdutos(input.token, input.menuId, {
        tipo: 'pizza',
        limit,
        offset,
      })
    )
    return pizzasNoMenu.some(p => p.grupoProduto?.id === input.categoriaPizzaId)
  }

  async listarMenuIdsComPizzaCategoria(input: {
    token: string
    categoriaPizzaId: string
    menuIds: string[]
  }): Promise<string[]> {
    const checks = await Promise.all(
      input.menuIds.map(async menuId => {
        const linked = await this.menuTemPizzaCategoria({ ...input, menuId })
        return linked ? menuId : null
      })
    )
    return checks.filter((id): id is string => Boolean(id))
  }

  async vincularSaboresPizzaAoMenu(input: {
    token: string
    menuId: string
    saborIds: string[]
  }): Promise<void> {
    const ids = uniqueIds(input.saborIds)
    if (ids.length === 0) return

    for (const chunk of chunkIds(ids, MENU_PAGE_LIMIT)) {
      await this.menuGateway.atualizarProdutos(input.token, input.menuId, { add: chunk })
    }
  }

  async desvincularSaboresPizzaDoMenu(input: {
    token: string
    menuId: string
    saborIds: string[]
  }): Promise<void> {
    const ids = uniqueIds(input.saborIds)
    if (ids.length === 0) return

    for (const chunk of chunkIds(ids, MENU_PAGE_LIMIT)) {
      await this.menuGateway.atualizarProdutos(input.token, input.menuId, { remove: chunk })
    }
  }

  async vincularPizzaCategoriaAoMenu(input: {
    token: string
    menuId: string
    categoriaPizzaId: string
  }): Promise<number> {
    const sabores = await this.listarSaboresAtivosDaCategoria(input)
    if (sabores.length === 0) {
      throw new Error('Cadastre ao menos um sabor ativo antes de vincular ao cardápio')
    }

    const jaNoMenu = await this.listarSaboresPizzaNoMenu(input)
    const idsJaVinculados = new Set(jaNoMenu.map(p => p.produtoId))
    const novos = sabores.map(s => s.id).filter(id => !idsJaVinculados.has(id))

    await this.vincularSaboresPizzaAoMenu({
      token: input.token,
      menuId: input.menuId,
      saborIds: novos,
    })
    return novos.length
  }

  async desvincularPizzaCategoriaDoMenu(input: {
    token: string
    menuId: string
    categoriaPizzaId: string
  }): Promise<void> {
    const vinculados = await this.listarSaboresPizzaNoMenu(input)
    await this.desvincularSaboresPizzaDoMenu({
      token: input.token,
      menuId: input.menuId,
      saborIds: vinculados.map(p => p.produtoId),
    })
  }

  async vincularSaborAosMenusDaCategoria(input: {
    token: string
    categoriaPizzaId: string
    saborId: string
    menuIdsCandidatos: string[]
  }): Promise<void> {
    const menusVinculados = await this.listarMenuIdsComPizzaCategoria({
      token: input.token,
      categoriaPizzaId: input.categoriaPizzaId,
      menuIds: input.menuIdsCandidatos,
    })
    await Promise.all(
      menusVinculados.map(menuId =>
        this.vincularSaboresPizzaAoMenu({
          token: input.token,
          menuId,
          saborIds: [input.saborId],
        })
      )
    )
  }
}
