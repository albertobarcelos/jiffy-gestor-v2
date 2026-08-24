import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { MenuGrupoProduto, MenuProduto } from '@/src/shared/types/menus'

const PAGE_LIMIT = 100

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const response = await fetchGestorApi(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      (errorData as { message?: string; error?: string }).message ||
        (errorData as { error?: string }).error ||
        'Erro na requisição'
    )
  }
  return (await response.json()) as T
}

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

    const data = await fetchJson<{ items?: MenuProduto[] }>(
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
    const data = await fetchJson<{ items?: MenuGrupoProduto[] }>(
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
    const raw = await fetchJson<unknown>(
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
