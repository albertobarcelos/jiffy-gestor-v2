import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { MenuProduto } from '@/src/shared/types/menus'
import type { SaborPizzaSummary } from '@/src/shared/types/pizza'

/** Limite máximo aceito pelo backend em listagens e PATCH em lote de menu produtos. */
const MENU_PAGE_LIMIT = 100

async function parseError(response: Response, fallback: string): Promise<never> {
  const errorData = await response.json().catch(() => ({}))
  throw new ApiError(
    (errorData as { message?: string }).message || fallback,
    response.status,
    errorData
  )
}

async function fetchPaginatedItems<T>(
  buildUrl: (offset: number, limit: number) => string,
  token: string
): Promise<T[]> {
  const items: T[] = []
  let offset = 0

  while (true) {
    const response = await fetchGestorApi(buildUrl(offset, MENU_PAGE_LIMIT), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) await parseError(response, 'Erro ao carregar dados')
    const data = await response.json()
    const page = (data.items ?? []) as T[]
    items.push(...page)

    const count = Number(data.count ?? items.length)
    offset += page.length
    if (page.length === 0 || offset >= count) break
  }

  return items
}

export async function listarSaboresAtivosDaCategoria(
  token: string,
  categoriaPizzaId: string
): Promise<SaborPizzaSummary[]> {
  const items = await fetchPaginatedItems<SaborPizzaSummary>(
    (offset, limit) =>
      `/api/cardapio/pizza/sabores?categoriaPizzaId=${categoriaPizzaId}&ativo=true&limit=${limit}&offset=${offset}`,
    token
  )
  return items.filter(s => s.ativo)
}

export async function listarSaboresPizzaNoMenu(
  token: string,
  menuId: string,
  categoriaPizzaId: string
): Promise<MenuProduto[]> {
  return fetchPaginatedItems<MenuProduto>(
    (offset, limit) =>
      `/api/menus/${menuId}/produtos?grupoProdutoId=${categoriaPizzaId}&tipo=pizza&limit=${limit}&offset=${offset}`,
    token
  )
}

export async function menuTemPizzaCategoria(
  token: string,
  menuId: string,
  categoriaPizzaId: string
): Promise<boolean> {
  const response = await fetchGestorApi(
    `/api/menus/${menuId}/produtos?grupoProdutoId=${categoriaPizzaId}&tipo=pizza&limit=1&offset=0`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!response.ok) await parseError(response, 'Erro ao verificar vínculo com cardápio')
  const data = await response.json()
  return Number(data.count ?? data.items?.length ?? 0) > 0
}

export async function listarMenuIdsComPizzaCategoria(
  token: string,
  categoriaPizzaId: string,
  menuIds: string[]
): Promise<string[]> {
  const checks = await Promise.all(
    menuIds.map(async menuId => {
      const linked = await menuTemPizzaCategoria(token, menuId, categoriaPizzaId)
      return linked ? menuId : null
    })
  )
  return checks.filter((id): id is string => Boolean(id))
}

function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size))
  }
  return chunks
}

export async function vincularSaboresPizzaAoMenu(
  token: string,
  menuId: string,
  saborIds: string[]
): Promise<void> {
  const ids = [...new Set(saborIds.filter(Boolean))]
  if (ids.length === 0) return

  for (const chunk of chunkIds(ids, MENU_PAGE_LIMIT)) {
    const response = await fetchGestorApi(`/api/menus/${menuId}/produtos`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ add: chunk }),
    })
    if (!response.ok) await parseError(response, 'Erro ao vincular sabores ao cardápio')
  }
}

export async function desvincularSaboresPizzaDoMenu(
  token: string,
  menuId: string,
  saborIds: string[]
): Promise<void> {
  const ids = [...new Set(saborIds.filter(Boolean))]
  if (ids.length === 0) return

  for (const chunk of chunkIds(ids, MENU_PAGE_LIMIT)) {
    const response = await fetchGestorApi(`/api/menus/${menuId}/produtos`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ remove: chunk }),
    })
    if (!response.ok) await parseError(response, 'Erro ao desvincular sabores do cardápio')
  }
}

export async function vincularPizzaCategoriaAoMenu(
  token: string,
  menuId: string,
  categoriaPizzaId: string
): Promise<number> {
  const sabores = await listarSaboresAtivosDaCategoria(token, categoriaPizzaId)
  if (sabores.length === 0) {
    throw new Error('Cadastre ao menos um sabor ativo antes de vincular ao cardápio')
  }

  const jaNoMenu = await listarSaboresPizzaNoMenu(token, menuId, categoriaPizzaId)
  const idsJaVinculados = new Set(jaNoMenu.map(p => p.produtoId))
  const novos = sabores.map(s => s.id).filter(id => !idsJaVinculados.has(id))

  await vincularSaboresPizzaAoMenu(token, menuId, novos)
  return novos.length
}

export async function desvincularPizzaCategoriaDoMenu(
  token: string,
  menuId: string,
  categoriaPizzaId: string
): Promise<void> {
  const vinculados = await listarSaboresPizzaNoMenu(token, menuId, categoriaPizzaId)
  await desvincularSaboresPizzaDoMenu(
    token,
    menuId,
    vinculados.map(p => p.produtoId)
  )
}

/** Vincula um sabor recém-criado a todos os cardápios onde a categoria já aparece. */
export async function vincularSaborAosMenusDaCategoria(
  token: string,
  categoriaPizzaId: string,
  saborId: string,
  menuIdsCandidatos: string[]
): Promise<void> {
  const menusVinculados = await listarMenuIdsComPizzaCategoria(
    token,
    categoriaPizzaId,
    menuIdsCandidatos
  )
  await Promise.all(
    menusVinculados.map(menuId => vincularSaboresPizzaAoMenu(token, menuId, [saborId]))
  )
}
