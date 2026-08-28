import { fetchBffJson } from '@/src/infrastructure/api/bffClient'
import type { MenuGrupoProduto, MenuProduto } from '@/src/shared/types/menus'

const PAGE_LIMIT = 100

export type MenuProdutoCatalogTipoFiltro = 'all' | 'padrao' | 'pizza'

export async function fetchAllMenuProdutos(
  menuId: string,
  token: string,
  filters?: {
    grupoProdutoId?: string
    q?: string
    ativo?: boolean
    tipo?: MenuProdutoCatalogTipoFiltro
  }
): Promise<MenuProduto[]> {
  const items: MenuProduto[] = []
  let offset = 0

  while (true) {
    const params = new URLSearchParams({
      limit: String(PAGE_LIMIT),
      offset: String(offset),
    })
    if (filters?.grupoProdutoId) params.set('grupoProdutoId', filters.grupoProdutoId)
    if (filters?.q?.trim()) params.set('q', filters.q.trim())
    if (filters?.ativo !== undefined) params.set('ativo', String(filters.ativo))
    if (filters?.tipo) params.set('tipo', filters.tipo)

    const data = await fetchBffJson<{ items?: MenuProduto[] }>(
      `/api/menus/${encodeURIComponent(menuId)}/produtos?${params}`,
      token
    )
    const page = Array.isArray(data.items) ? data.items : []
    items.push(...page)
    if (page.length < PAGE_LIMIT) break
    offset += page.length
  }

  return items
}

export async function fetchAllMenuGruposProdutos(
  menuId: string,
  token: string
): Promise<MenuGrupoProduto[]> {
  const items: MenuGrupoProduto[] = []
  let offset = 0

  while (true) {
    const params = new URLSearchParams({
      limit: String(PAGE_LIMIT),
      offset: String(offset),
    })
    const data = await fetchBffJson<{ items?: MenuGrupoProduto[] }>(
      `/api/menus/${encodeURIComponent(menuId)}/grupos-produtos?${params}`,
      token
    )
    const page = Array.isArray(data.items) ? data.items : []
    items.push(...page)
    if (page.length < PAGE_LIMIT) break
    offset += page.length
  }

  return items
}

export async function fetchMenuProdutoSnapshot(
  menuId: string,
  produtoId: string,
  token: string
): Promise<MenuProduto | null> {
  try {
    const raw = await fetchBffJson<unknown>(
      `/api/menus/${encodeURIComponent(menuId)}/produtos/${encodeURIComponent(produtoId)}`,
      token
    )
    if (!raw || typeof raw !== 'object') return null
    const obj = raw as Record<string, unknown>
    const data = obj.data && typeof obj.data === 'object' ? obj.data : obj
    if (!data || typeof data !== 'object') return null
    return data as MenuProduto
  } catch {
    return null
  }
}

export async function fetchMenuProdutoOrThrow(
  menuId: string,
  produtoId: string,
  token: string
): Promise<MenuProduto> {
  const snapshot = await fetchMenuProdutoSnapshot(menuId, produtoId, token)
  if (!snapshot) {
    throw new Error('Erro ao carregar produto deste cardápio')
  }
  return snapshot
}
