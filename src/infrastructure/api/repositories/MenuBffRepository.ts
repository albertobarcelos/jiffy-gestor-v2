import {
  fetchBffDelete,
  fetchBffFormData,
  fetchBffJson,
  fetchBffVoid,
} from '@/src/infrastructure/api/bffClient'
import type {
  CreateMenuInput,
  Menu,
  MenuGrupoProduto,
  MenuProduto,
  UpdateMenuInput,
  UpdateMenuProdutoInput,
  UpdateMenuProdutosBatchInput,
} from '@/src/shared/types/menus'
import type { MenuProdutoCatalogTipoFiltro } from '@/src/infrastructure/api/repositories/menuCatalogFetch'

type ListarMenusParams = {
  q?: string
  ativo?: boolean | null
  tipo?: string
  limit?: number
  offset?: number
}

type ListarMenuProdutosParams = {
  q?: string
  limit?: number
  offset?: number
  ativo?: boolean | null
  favorito?: boolean | null
  grupoProdutoId?: string
  grupoComplementosId?: string
  tipo?: MenuProdutoCatalogTipoFiltro
}

type ListarMenuGruposParams = {
  q?: string
  limit?: number
  offset?: number
  ativo?: boolean | null
  grupoProdutoId?: string
}

function unwrapData<T>(payload: { data?: T } & T): T {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data != null) {
    return payload.data as T
  }
  return payload as T
}

/**
 * Acesso ao BFF `/api/menus/*` a partir do browser (sem acoplar presentation).
 */
export class MenuBffRepository {
  async listarMenus(token: string, params: ListarMenusParams = {}) {
    const searchParams = new URLSearchParams()
    if (params.q?.trim()) searchParams.set('q', params.q.trim())
    if (params.ativo !== null && params.ativo !== undefined) {
      searchParams.set('ativo', String(params.ativo))
    }
    if (params.tipo) searchParams.set('tipo', params.tipo)
    searchParams.set('limit', String(params.limit ?? 50))
    searchParams.set('offset', String(params.offset ?? 0))

    const data = await fetchBffJson<{ items?: Menu[]; count?: number }>(
      `/api/menus?${searchParams}`,
      token
    )
    return {
      items: (data.items ?? []) as Menu[],
      count: data.count ?? 0,
    }
  }

  async buscarMenuPorId(token: string, menuId: string): Promise<Menu> {
    const data = await fetchBffJson<{ data: Menu }>(
      `/api/menus/${encodeURIComponent(menuId)}`,
      token
    )
    return unwrapData(data)
  }

  async criarMenu(token: string, input: CreateMenuInput): Promise<Menu> {
    const data = await fetchBffJson<{ data: Menu }>(`/api/menus`, token, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return unwrapData(data)
  }

  async atualizarMenu(token: string, menuId: string, input: UpdateMenuInput): Promise<Menu> {
    const data = await fetchBffJson<{ data: Menu }>(
      `/api/menus/${encodeURIComponent(menuId)}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    )
    return unwrapData(data)
  }

  async excluirMenu(token: string, menuId: string): Promise<void> {
    await fetchBffDelete(`/api/menus/${encodeURIComponent(menuId)}`, token)
  }

  async buscarProduto(
    token: string,
    menuId: string,
    produtoId: string
  ): Promise<MenuProduto> {
    const data = await fetchBffJson<{ data: MenuProduto }>(
      `/api/menus/${encodeURIComponent(menuId)}/produtos/${encodeURIComponent(produtoId)}`,
      token
    )
    return unwrapData(data)
  }

  async listarProdutos(token: string, menuId: string, params: ListarMenuProdutosParams) {
    const searchParams = new URLSearchParams()
    searchParams.set('limit', String(params.limit ?? 100))
    searchParams.set('offset', String(params.offset ?? 0))
    if (params.q?.trim()) searchParams.set('q', params.q.trim())
    if (params.grupoProdutoId) searchParams.set('grupoProdutoId', params.grupoProdutoId)
    if (params.grupoComplementosId) {
      searchParams.set('grupoComplementosId', params.grupoComplementosId)
    }
    if (params.ativo !== null && params.ativo !== undefined) {
      searchParams.set('ativo', String(params.ativo))
    }
    if (params.favorito !== null && params.favorito !== undefined) {
      searchParams.set('favorito', String(params.favorito))
    }
    if (params.tipo) searchParams.set('tipo', params.tipo)

    const data = await fetchBffJson<{ items?: MenuProduto[]; count?: number }>(
      `/api/menus/${encodeURIComponent(menuId)}/produtos?${searchParams}`,
      token
    )
    return {
      items: (data.items ?? []) as MenuProduto[],
      count: data.count ?? 0,
    }
  }

  async atualizarProdutos(
    token: string,
    menuId: string,
    input: UpdateMenuProdutosBatchInput
  ): Promise<Menu> {
    const data = await fetchBffJson<{ data: Menu }>(
      `/api/menus/${encodeURIComponent(menuId)}/produtos`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    )
    return unwrapData(data)
  }

  async atualizarProduto(
    token: string,
    menuId: string,
    produtoId: string,
    input: UpdateMenuProdutoInput
  ): Promise<MenuProduto> {
    const data = await fetchBffJson<{ data: MenuProduto }>(
      `/api/menus/${encodeURIComponent(menuId)}/produtos/${encodeURIComponent(produtoId)}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    )
    return unwrapData(data)
  }

  async reordenarProduto(
    token: string,
    menuId: string,
    produtoId: string,
    novaPosicao: number
  ): Promise<void> {
    await fetchBffVoid(
      `/api/menus/${encodeURIComponent(menuId)}/produtos/${encodeURIComponent(produtoId)}/reordena-produto`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({ novaPosicao }),
      }
    )
  }

  async uploadImagemProduto(
    token: string,
    menuId: string,
    produtoId: string,
    file: File
  ): Promise<MenuProduto> {
    const form = new FormData()
    form.append('file', file)
    const data = await fetchBffFormData<{ data: MenuProduto }>(
      `/api/menus/${encodeURIComponent(menuId)}/produtos/${encodeURIComponent(produtoId)}/imagem`,
      token,
      form
    )
    return unwrapData(data)
  }

  async listarGrupos(token: string, menuId: string, params: ListarMenuGruposParams) {
    const searchParams = new URLSearchParams()
    searchParams.set('limit', String(params.limit ?? 100))
    searchParams.set('offset', String(params.offset ?? 0))
    if (params.q?.trim()) searchParams.set('q', params.q.trim())
    if (params.ativo !== null && params.ativo !== undefined) {
      searchParams.set('ativo', String(params.ativo))
    }
    if (params.grupoProdutoId) searchParams.set('grupoProdutoId', params.grupoProdutoId)

    const data = await fetchBffJson<{ items?: MenuGrupoProduto[]; count?: number }>(
      `/api/menus/${encodeURIComponent(menuId)}/grupos-produtos?${searchParams}`,
      token
    )
    return {
      items: (data.items ?? []) as MenuGrupoProduto[],
      count: data.count ?? 0,
    }
  }

  async renomearGrupo(
    token: string,
    menuId: string,
    grupoProdutoId: string,
    nome: string
  ): Promise<MenuGrupoProduto> {
    const data = await fetchBffJson<{ data: MenuGrupoProduto }>(
      `/api/menus/${encodeURIComponent(menuId)}/grupos-produtos/${encodeURIComponent(grupoProdutoId)}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({ nome }),
      }
    )
    return unwrapData(data)
  }

  async reordenarGrupo(
    token: string,
    menuId: string,
    grupoProdutoId: string,
    novaPosicao: number
  ): Promise<void> {
    await fetchBffVoid(
      `/api/menus/${encodeURIComponent(menuId)}/grupos-produtos/${encodeURIComponent(grupoProdutoId)}/reordena-grupo`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({ novaPosicao }),
      }
    )
  }
}

export const menuBffRepository = new MenuBffRepository()
