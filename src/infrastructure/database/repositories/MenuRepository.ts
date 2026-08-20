import { ApiClient } from '@/src/infrastructure/api/apiClient'
import type {
  BuscarMenuGruposParams,
  BuscarMenuProdutosParams,
  BuscarMenusParams,
  BuscarMenusPaginatedResponse,
  BuscarMenusResponse,
  IMenuRepository,
} from '@/src/domain/repositories/IMenuRepository'
import type {
  CreateMenuInput,
  ImageUploadIntentInput,
  ImageUploadIntentResponse,
  Menu,
  MenuGrupoProduto,
  MenuProduto,
  UpdateMenuInput,
  UpdateMenuProdutoInput,
  UpdateMenuProdutosBatchInput,
} from '@/src/shared/types/menus'

const BASE = '/api/v1/cardapio/menus'

function appendPagination(
  query: URLSearchParams,
  params: { q?: string; limit?: number; offset?: number; ativo?: boolean | null }
) {
  if (params.q?.trim()) query.append('q', params.q.trim())
  if (params.limit != null) query.append('limit', String(params.limit))
  if (params.offset != null) query.append('offset', String(params.offset))
  if (params.ativo !== null && params.ativo !== undefined) {
    query.append('ativo', String(params.ativo))
  }
}

function mapPaginated<T>(data: any): BuscarMenusPaginatedResponse<T> {
  return {
    items: (data?.items ?? []) as T[],
    count: data?.count ?? 0,
    page: data?.page,
    limit: data?.limit,
    totalPages: data?.totalPages,
    hasNext: data?.hasNext,
    hasPrevious: data?.hasPrevious,
  }
}

/**
 * Proxy dos endpoints de menu do cardápio (snapshots por menu).
 */
export class MenuRepository implements IMenuRepository {
  constructor(
    private readonly apiClient: ApiClient,
    private readonly token: string
  ) {}

  private authHeaders(json = false): HeadersInit {
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${this.token}`,
    }
  }

  async listarMenus(params: BuscarMenusParams): Promise<BuscarMenusResponse> {
    const query = new URLSearchParams()
    appendPagination(query, params)
    if (params.tipo) query.append('tipo', params.tipo)

    const { data } = await this.apiClient.request<any>(
      `${BASE}?${query.toString()}`,
      { headers: this.authHeaders() }
    )
    return mapPaginated<Menu>(data)
  }

  async buscarMenuPorId(id: string): Promise<Menu> {
    const { data } = await this.apiClient.request<Menu>(`${BASE}/${id}`, {
      headers: this.authHeaders(),
    })
    return data
  }

  async criarMenu(input: CreateMenuInput): Promise<Menu> {
    const { data } = await this.apiClient.request<Menu>(BASE, {
      method: 'POST',
      headers: this.authHeaders(true),
      body: JSON.stringify(input),
    })
    return data
  }

  async atualizarMenu(id: string, input: UpdateMenuInput): Promise<Menu> {
    const { data } = await this.apiClient.request<Menu>(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: this.authHeaders(true),
      body: JSON.stringify(input),
    })
    return data
  }

  async excluirMenu(id: string): Promise<void> {
    await this.apiClient.request(`${BASE}/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    })
  }

  async listarProdutos(menuId: string, params: BuscarMenuProdutosParams) {
    const query = new URLSearchParams()
    appendPagination(query, params)
    if (params.favorito !== null && params.favorito !== undefined) {
      query.append('favorito', String(params.favorito))
    }
    if (params.grupoProdutoId) query.append('grupoProdutoId', params.grupoProdutoId)
    if (params.grupoComplementosId) {
      query.append('grupoComplementosId', params.grupoComplementosId)
    }
    if (params.tipo) query.append('tipo', params.tipo)

    const { data } = await this.apiClient.request<any>(
      `${BASE}/${menuId}/produtos?${query.toString()}`,
      { headers: this.authHeaders() }
    )
    return mapPaginated<MenuProduto>(data)
  }

  async buscarProduto(menuId: string, produtoId: string): Promise<MenuProduto> {
    const { data } = await this.apiClient.request<MenuProduto>(
      `${BASE}/${menuId}/produtos/${produtoId}`,
      { headers: this.authHeaders() }
    )
    return data
  }

  async atualizarProdutos(
    menuId: string,
    input: UpdateMenuProdutosBatchInput
  ): Promise<Menu> {
    const { data } = await this.apiClient.request<Menu>(
      `${BASE}/${menuId}/produtos`,
      {
        method: 'PATCH',
        headers: this.authHeaders(true),
        body: JSON.stringify(input),
      }
    )
    return data
  }

  async atualizarProduto(
    menuId: string,
    produtoId: string,
    input: UpdateMenuProdutoInput
  ): Promise<MenuProduto> {
    const { data } = await this.apiClient.request<MenuProduto>(
      `${BASE}/${menuId}/produtos/${produtoId}`,
      {
        method: 'PATCH',
        headers: this.authHeaders(true),
        body: JSON.stringify(input),
      }
    )
    return data
  }

  async reordenarProduto(
    menuId: string,
    produtoId: string,
    novaPosicao: number
  ): Promise<void> {
    await this.apiClient.request(
      `${BASE}/${menuId}/produtos/${produtoId}/reordena-produto`,
      {
        method: 'PATCH',
        headers: this.authHeaders(true),
        body: JSON.stringify({ novaPosicao }),
      }
    )
  }

  async criarUploadIntentProduto(
    menuId: string,
    produtoId: string,
    input: ImageUploadIntentInput
  ): Promise<ImageUploadIntentResponse> {
    const { data } = await this.apiClient.request<ImageUploadIntentResponse>(
      `${BASE}/${menuId}/produtos/${produtoId}/upload-intent`,
      {
        method: 'POST',
        headers: this.authHeaders(true),
        body: JSON.stringify(input),
      }
    )
    return data
  }

  async confirmarUploadIntent(uploadIntentId: string): Promise<void> {
    await this.apiClient.request(
      `/api/v1/media/image-upload-intents/${uploadIntentId}/confirm`,
      {
        method: 'POST',
        headers: this.authHeaders(),
      }
    )
  }

  async listarGrupos(menuId: string, params: BuscarMenuGruposParams) {
    const query = new URLSearchParams()
    appendPagination(query, params)
    if (params.grupoProdutoId) query.append('grupoProdutoId', params.grupoProdutoId)

    const { data } = await this.apiClient.request<any>(
      `${BASE}/${menuId}/grupos-produtos?${query.toString()}`,
      { headers: this.authHeaders() }
    )
    return mapPaginated<MenuGrupoProduto>(data)
  }

  async atualizarGrupo(
    menuId: string,
    grupoProdutoId: string,
    nome: string
  ): Promise<MenuGrupoProduto> {
    const { data } = await this.apiClient.request<MenuGrupoProduto>(
      `${BASE}/${menuId}/grupos-produtos/${grupoProdutoId}`,
      {
        method: 'PATCH',
        headers: this.authHeaders(true),
        body: JSON.stringify({ nome }),
      }
    )
    return data
  }

  async reordenarGrupo(
    menuId: string,
    grupoProdutoId: string,
    novaPosicao: number
  ): Promise<void> {
    await this.apiClient.request(
      `${BASE}/${menuId}/grupos-produtos/${grupoProdutoId}/reordena-grupo`,
      {
        method: 'PATCH',
        headers: this.authHeaders(true),
        body: JSON.stringify({ novaPosicao }),
      }
    )
  }
}
