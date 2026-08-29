import {
  listarMenuGruposViaBffUseCase,
  listarMenuProdutosViaBffUseCase,
} from '@/src/application/use-cases/menus/menuBffUseCases'
import { MENU_CATALOG_PAGE_SIZE } from '@/src/presentation/hooks/menus/useMenuCatalog'
import { coletarGruposMenuPorSnapshot } from '@/src/presentation/components/features/menus/ordenarGruposMenuSnapshot'
import type { MenuGrupoProduto, MenuProduto } from '@/src/shared/types/menus'

async function fetchAllPages<T>(params: {
  fetchPage: (offset: number) => Promise<{ items: T[]; count: number }>
}): Promise<T[]> {
  const items: T[] = []
  let offset = 0
  let total = Infinity

  while (offset < total) {
    const page = await params.fetchPage(offset)
    items.push(...page.items)
    total = page.count
    if (page.items.length === 0) break
    offset += page.items.length
    if (page.items.length < MENU_CATALOG_PAGE_SIZE) break
  }

  return items
}

export async function fetchAllMenuGrupos(
  token: string,
  menuId: string
): Promise<MenuGrupoProduto[]> {
  const pages: Array<{ items: MenuGrupoProduto[] }> = []
  let offset = 0
  let total = Infinity

  while (offset < total) {
    const data = await listarMenuGruposViaBffUseCase.execute({
      token,
      menuId,
      limit: MENU_CATALOG_PAGE_SIZE,
      offset,
    })
    pages.push({ items: data.items })
    total = data.count
    if (data.items.length === 0) break
    offset += data.items.length
    if (data.items.length < MENU_CATALOG_PAGE_SIZE) break
  }

  return coletarGruposMenuPorSnapshot(pages)
}

export async function fetchAllMenuProdutosByGrupo(
  token: string,
  menuId: string,
  grupoProdutoId: string
): Promise<MenuProduto[]> {
  const items = await fetchAllPages({
    fetchPage: offset =>
      listarMenuProdutosViaBffUseCase.execute({
        token,
        menuId,
        grupoProdutoId,
        ativo: null,
        tipo: 'all',
        limit: MENU_CATALOG_PAGE_SIZE,
        offset,
      }),
  })

  return [...items].sort((a, b) => {
    const oa = Number(a.ordem)
    const ob = Number(b.ordem)
    if (Number.isFinite(oa) && Number.isFinite(ob) && oa !== ob) return oa - ob
    return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
  })
}

export function grupoBaseId(grupo: MenuGrupoProduto): string {
  return grupo.grupoBase?.id || grupo.id
}

export function categoriaLabel(grupo: MenuGrupoProduto): string {
  return grupo.nome?.trim() || grupo.grupoBase?.nome?.trim() || 'Categoria'
}

export function produtoLabel(produto: MenuProduto): string {
  return produto.nome?.trim() || 'Produto'
}
