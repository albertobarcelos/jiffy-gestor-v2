import { ApiClient } from '@/src/infrastructure/api/apiClient'
import type { IPizzaRepository } from '@/src/domain/repositories/IPizzaRepository'
import type {
  CategoriaPizza,
  CategoriaPizzaCompletoResponse,
  CreateCategoriaPizzaCompletoInput,
  CreateCategoriaPizzaInput,
  CreateSaborPizzaInput,
  PizzaPaginatedResponse,
  PizzaPaginationParams,
  PizzaTamanho,
  SaborPizza,
  SaborPizzaSummary,
  UpdateSaborPizzaInput,
} from '@/src/shared/types/pizza'

const BASE = '/api/v1/cardapio/pizza'

function appendPagination(
  query: URLSearchParams,
  params: PizzaPaginationParams & { categoriaPizzaId?: string; grupoPizzaConfigId?: string }
) {
  if (params.q?.trim()) query.append('q', params.q.trim())
  if (params.limit != null) query.append('limit', String(params.limit))
  if (params.offset != null) query.append('offset', String(params.offset))
  if (params.ativo !== null && params.ativo !== undefined) {
    query.append('ativo', String(params.ativo))
  }
  if (params.categoriaPizzaId) query.append('categoriaPizzaId', params.categoriaPizzaId)
  if (params.grupoPizzaConfigId) query.append('grupoPizzaConfigId', params.grupoPizzaConfigId)
}

function mapPaginated<T>(data: unknown): PizzaPaginatedResponse<T> {
  const d = data as Record<string, unknown>
  return {
    items: (d?.items ?? []) as T[],
    count: (d?.count as number) ?? 0,
    page: d?.page as number | undefined,
    limit: d?.limit as number | undefined,
    totalPages: d?.totalPages as number | undefined,
    hasNext: d?.hasNext as boolean | undefined,
    hasPrevious: d?.hasPrevious as boolean | undefined,
  }
}

/**
 * Proxy dos endpoints de pizza do cardápio.
 */
export class PizzaRepository implements IPizzaRepository {
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

  async listarCategorias(params: PizzaPaginationParams) {
    const query = new URLSearchParams()
    appendPagination(query, params)
    const { data } = await this.apiClient.request<unknown>(
      `${BASE}/categorias?${query.toString()}`,
      { headers: this.authHeaders() }
    )
    return mapPaginated<CategoriaPizza>(data)
  }

  async buscarCategoriaPorId(id: string) {
    const { data } = await this.apiClient.request<CategoriaPizza>(`${BASE}/categorias/${id}`, {
      headers: this.authHeaders(),
    })
    return data
  }

  async criarCategoria(input: CreateCategoriaPizzaInput) {
    const { data } = await this.apiClient.request<CategoriaPizza>(`${BASE}/categorias`, {
      method: 'POST',
      headers: this.authHeaders(true),
      body: JSON.stringify(input),
    })
    return data
  }

  async criarCategoriaCompleto(input: CreateCategoriaPizzaCompletoInput) {
    const { data } = await this.apiClient.request<CategoriaPizzaCompletoResponse>(
      `${BASE}/categorias/completo`,
      {
        method: 'POST',
        headers: this.authHeaders(true),
        body: JSON.stringify(input),
      }
    )
    return data
  }

  async atualizarCategoria(id: string, input: Partial<CreateCategoriaPizzaInput>) {
    const { data } = await this.apiClient.request<CategoriaPizza>(`${BASE}/categorias/${id}`, {
      method: 'PATCH',
      headers: this.authHeaders(true),
      body: JSON.stringify(input),
    })
    return data
  }

  async reordenarCategoria(id: string, novaPosicao: number) {
    const { data } = await this.apiClient.request<CategoriaPizza>(
      `${BASE}/categorias/${id}/reordena-categoria`,
      {
        method: 'PATCH',
        headers: this.authHeaders(true),
        body: JSON.stringify({ novaPosicao }),
      }
    )
    return data
  }

  async excluirCategoria(id: string) {
    await this.apiClient.request(`${BASE}/categorias/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    })
  }

  async listarSabores(params: PizzaPaginationParams & { categoriaPizzaId?: string }) {
    const query = new URLSearchParams()
    appendPagination(query, params)
    const { data } = await this.apiClient.request<unknown>(
      `${BASE}/sabores?${query.toString()}`,
      { headers: this.authHeaders() }
    )
    return mapPaginated<SaborPizzaSummary>(data)
  }

  async buscarSaborPorId(id: string) {
    const { data } = await this.apiClient.request<SaborPizza>(`${BASE}/sabores/${id}`, {
      headers: this.authHeaders(),
    })
    return data
  }

  async criarSabor(input: CreateSaborPizzaInput) {
    const { data } = await this.apiClient.request<SaborPizza>(`${BASE}/sabores`, {
      method: 'POST',
      headers: this.authHeaders(true),
      body: JSON.stringify(input),
    })
    return data
  }

  async atualizarSabor(id: string, input: UpdateSaborPizzaInput) {
    const { data } = await this.apiClient.request<SaborPizza>(`${BASE}/sabores/${id}`, {
      method: 'PATCH',
      headers: this.authHeaders(true),
      body: JSON.stringify(input),
    })
    return data
  }

  async reordenarSabor(id: string, novaPosicao: number) {
    const { data } = await this.apiClient.request<SaborPizzaSummary>(
      `${BASE}/sabores/${id}/reordena-sabor`,
      {
        method: 'PATCH',
        headers: this.authHeaders(true),
        body: JSON.stringify({ novaPosicao }),
      }
    )
    return data
  }

  async excluirSabor(id: string) {
    await this.apiClient.request(`${BASE}/sabores/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    })
  }

  async listarTamanhos(params: PizzaPaginationParams & { categoriaPizzaId?: string }) {
    const query = new URLSearchParams()
    appendPagination(query, params)
    const { data } = await this.apiClient.request<unknown>(
      `${BASE}/tamanhos?${query.toString()}`,
      { headers: this.authHeaders() }
    )
    return mapPaginated<PizzaTamanho>(data)
  }

  async buscarTamanhoPorId(id: string) {
    const { data } = await this.apiClient.request<PizzaTamanho>(`${BASE}/tamanhos/${id}`, {
      headers: this.authHeaders(),
    })
    return data
  }

  async criarTamanho(input: {
    grupoPizzaConfigId: string
    nome: string
    quantidadePedacos: number
    quantidadeMaximaDivisoes: number
    ativo?: boolean
  }) {
    const { data } = await this.apiClient.request<PizzaTamanho>(`${BASE}/tamanhos`, {
      method: 'POST',
      headers: this.authHeaders(true),
      body: JSON.stringify(input),
    })
    return data
  }

  async atualizarTamanho(
    id: string,
    input: Partial<{
      nome: string
      quantidadePedacos: number
      quantidadeMaximaDivisoes: number
      ativo: boolean
    }>
  ) {
    const { data } = await this.apiClient.request<PizzaTamanho>(`${BASE}/tamanhos/${id}`, {
      method: 'PATCH',
      headers: this.authHeaders(true),
      body: JSON.stringify(input),
    })
    return data
  }

  async excluirTamanho(id: string) {
    await this.apiClient.request(`${BASE}/tamanhos/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    })
  }

  async listarGruposBordas(params: PizzaPaginationParams & { categoriaPizzaId?: string }) {
    const query = new URLSearchParams()
    appendPagination(query, params)
    const { data } = await this.apiClient.request<unknown>(
      `${BASE}/grupo-bordas?${query.toString()}`,
      { headers: this.authHeaders() }
    )
    return mapPaginated<unknown>(data)
  }

  async buscarGrupoBordasPorId(id: string) {
    const { data } = await this.apiClient.request<unknown>(`${BASE}/grupo-bordas/${id}`, {
      headers: this.authHeaders(),
    })
    return data
  }

  async criarGrupoBordas(input: unknown) {
    const { data } = await this.apiClient.request<unknown>(`${BASE}/grupo-bordas`, {
      method: 'POST',
      headers: this.authHeaders(true),
      body: JSON.stringify(input),
    })
    return data
  }

  async atualizarGrupoBordas(id: string, input: unknown) {
    const { data } = await this.apiClient.request<unknown>(`${BASE}/grupo-bordas/${id}`, {
      method: 'PATCH',
      headers: this.authHeaders(true),
      body: JSON.stringify(input),
    })
    return data
  }

  async excluirGrupoBordas(id: string) {
    await this.apiClient.request(`${BASE}/grupo-bordas/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    })
  }

  async listarGruposMassas(params: PizzaPaginationParams & { categoriaPizzaId?: string }) {
    const query = new URLSearchParams()
    appendPagination(query, params)
    const { data } = await this.apiClient.request<unknown>(
      `${BASE}/grupo-massas?${query.toString()}`,
      { headers: this.authHeaders() }
    )
    return mapPaginated<unknown>(data)
  }

  async buscarGrupoMassasPorId(id: string) {
    const { data } = await this.apiClient.request<unknown>(`${BASE}/grupo-massas/${id}`, {
      headers: this.authHeaders(),
    })
    return data
  }

  async criarGrupoMassas(input: unknown) {
    const { data } = await this.apiClient.request<unknown>(`${BASE}/grupo-massas`, {
      method: 'POST',
      headers: this.authHeaders(true),
      body: JSON.stringify(input),
    })
    return data
  }

  async atualizarGrupoMassas(id: string, input: unknown) {
    const { data } = await this.apiClient.request<unknown>(`${BASE}/grupo-massas/${id}`, {
      method: 'PATCH',
      headers: this.authHeaders(true),
      body: JSON.stringify(input),
    })
    return data
  }

  async excluirGrupoMassas(id: string) {
    await this.apiClient.request(`${BASE}/grupo-massas/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    })
  }
}
