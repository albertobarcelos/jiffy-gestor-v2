import type { IPizzaCadastroGateway } from '@/src/application/ports/IPizzaCadastroGateway'
import {
  fetchBffDelete,
  fetchBffJson,
  fetchBffVoid,
} from '@/src/infrastructure/api/bffClient'
import type {
  CreateGrupoBordasPizzaInput,
  CreateGrupoMassasPizzaInput,
  UpdateGrupoBordasPizzaInput,
  UpdateGrupoMassasPizzaInput,
} from '@/src/domain/repositories/IPizzaRepository'
import type {
  CategoriaPizza,
  CategoriaPizzaCompletoResponse,
  ComplementoPizza,
  CreateCategoriaPizzaCompletoInput,
  CreateComplementoPizzaInput,
  CreateSaborPizzaInput,
  GrupoBordasPizza,
  GrupoBordasPizzaSummary,
  GrupoMassasPizza,
  GrupoMassasPizzaSummary,
  PizzaPaginatedResponse,
  PizzaPaginationParams,
  PizzaTamanho,
  ReplaceComplementoPizzaPrecosInput,
  SaborPizza,
  SaborPizzaSummary,
  UpdateCategoriaPizzaInput,
  UpdateSaborPizzaInput,
} from '@/src/shared/types/pizza'

const BASE = '/api/cardapio/pizza'

function unwrapData<T>(payload: { data: T } | T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data
  }
  return payload as T
}

function appendPagination(
  searchParams: URLSearchParams,
  params: PizzaPaginationParams & { categoriaPizzaId?: string } = {}
) {
  if (params.q?.trim()) searchParams.set('q', params.q.trim())
  if (params.ativo !== null && params.ativo !== undefined) {
    searchParams.set('ativo', String(params.ativo))
  }
  if (params.categoriaPizzaId) searchParams.set('categoriaPizzaId', params.categoriaPizzaId)
  searchParams.set('limit', String(params.limit ?? 50))
  searchParams.set('offset', String(params.offset ?? 0))
}

function normalizePaginated<T>(payload: Partial<PizzaPaginatedResponse<T>>): PizzaPaginatedResponse<T> {
  return {
    ...payload,
    items: (payload.items ?? []) as T[],
    count: payload.count ?? 0,
  }
}

export class PizzaBffRepository implements IPizzaCadastroGateway {
  async listarCategorias(
    token: string,
    params: PizzaPaginationParams = {}
  ): Promise<PizzaPaginatedResponse<CategoriaPizza>> {
    const searchParams = new URLSearchParams()
    appendPagination(searchParams, params)

    const data = await fetchBffJson<Partial<PizzaPaginatedResponse<CategoriaPizza>>>(
      `${BASE}/categorias?${searchParams}`,
      token
    )
    return normalizePaginated(data)
  }

  async buscarCategoria(token: string, categoriaId: string): Promise<CategoriaPizza> {
    const data = await fetchBffJson<{ data: CategoriaPizza }>(
      `${BASE}/categorias/${encodeURIComponent(categoriaId)}`,
      token
    )
    return unwrapData(data)
  }

  async atualizarCategoria(
    token: string,
    categoriaId: string,
    input: UpdateCategoriaPizzaInput
  ): Promise<CategoriaPizza> {
    const data = await fetchBffJson<{ data: CategoriaPizza }>(
      `${BASE}/categorias/${encodeURIComponent(categoriaId)}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    )
    return unwrapData(data)
  }

  async criarCategoriaCompleto(
    token: string,
    input: CreateCategoriaPizzaCompletoInput
  ): Promise<CategoriaPizzaCompletoResponse> {
    const data = await fetchBffJson<{ data: CategoriaPizzaCompletoResponse }>(
      `${BASE}/categorias/completo`,
      token,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    )
    return unwrapData(data)
  }

  async reordenarCategoria(
    token: string,
    categoriaId: string,
    novaPosicao: number
  ): Promise<CategoriaPizza> {
    const data = await fetchBffJson<{ data: CategoriaPizza }>(
      `${BASE}/categorias/${encodeURIComponent(categoriaId)}/reordena-categoria`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({ novaPosicao }),
      }
    )
    return unwrapData(data)
  }

  async listarSabores(
    token: string,
    params: PizzaPaginationParams & { categoriaPizzaId?: string } = {}
  ): Promise<PizzaPaginatedResponse<SaborPizzaSummary>> {
    const searchParams = new URLSearchParams()
    appendPagination(searchParams, params)

    const data = await fetchBffJson<Partial<PizzaPaginatedResponse<SaborPizzaSummary>>>(
      `${BASE}/sabores?${searchParams}`,
      token
    )
    return normalizePaginated(data)
  }

  async buscarSabor(token: string, saborId: string): Promise<SaborPizza> {
    const data = await fetchBffJson<{ data: SaborPizza }>(
      `${BASE}/sabores/${encodeURIComponent(saborId)}`,
      token
    )
    return unwrapData(data)
  }

  async criarSabor(token: string, input: CreateSaborPizzaInput): Promise<SaborPizza> {
    const data = await fetchBffJson<{ data: SaborPizza }>(`${BASE}/sabores`, token, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return unwrapData(data)
  }

  async atualizarSabor(
    token: string,
    saborId: string,
    input: UpdateSaborPizzaInput
  ): Promise<SaborPizza> {
    const data = await fetchBffJson<{ data: SaborPizza }>(
      `${BASE}/sabores/${encodeURIComponent(saborId)}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    )
    return unwrapData(data)
  }

  async excluirSabor(token: string, saborId: string): Promise<void> {
    await fetchBffDelete(`${BASE}/sabores/${encodeURIComponent(saborId)}`, token)
  }

  async reordenarSabor(
    token: string,
    saborId: string,
    novaPosicao: number
  ): Promise<SaborPizzaSummary> {
    const data = await fetchBffJson<{ data: SaborPizzaSummary }>(
      `${BASE}/sabores/${encodeURIComponent(saborId)}/reordena-sabor`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({ novaPosicao }),
      }
    )
    return unwrapData(data)
  }

  async listarTamanhos(
    token: string,
    params: PizzaPaginationParams & { categoriaPizzaId?: string } = {}
  ): Promise<PizzaPaginatedResponse<PizzaTamanho>> {
    const searchParams = new URLSearchParams()
    appendPagination(searchParams, params)

    const data = await fetchBffJson<Partial<PizzaPaginatedResponse<PizzaTamanho>>>(
      `${BASE}/tamanhos?${searchParams}`,
      token
    )
    return normalizePaginated(data)
  }

  async criarTamanho(
    token: string,
    input: {
      grupoPizzaConfigId: string
      nome: string
      quantidadePedacos: number
      quantidadeMaximaDivisoes: number
      ativo?: boolean
    }
  ): Promise<PizzaTamanho> {
    const data = await fetchBffJson<{ data: PizzaTamanho }>(`${BASE}/tamanhos`, token, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return unwrapData(data)
  }

  async atualizarTamanho(
    token: string,
    tamanhoId: string,
    input: Partial<{
      nome: string
      quantidadePedacos: number
      quantidadeMaximaDivisoes: number
      ativo: boolean
    }>
  ): Promise<PizzaTamanho> {
    const data = await fetchBffJson<{ data: PizzaTamanho }>(
      `${BASE}/tamanhos/${encodeURIComponent(tamanhoId)}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    )
    return unwrapData(data)
  }

  async excluirTamanho(token: string, tamanhoId: string): Promise<void> {
    await fetchBffDelete(`${BASE}/tamanhos/${encodeURIComponent(tamanhoId)}`, token)
  }

  async listarGruposMassas(
    token: string,
    params: PizzaPaginationParams & { categoriaPizzaId?: string } = {}
  ): Promise<PizzaPaginatedResponse<GrupoMassasPizzaSummary>> {
    const searchParams = new URLSearchParams()
    appendPagination(searchParams, params)

    const data = await fetchBffJson<Partial<PizzaPaginatedResponse<GrupoMassasPizzaSummary>>>(
      `${BASE}/grupo-massas?${searchParams}`,
      token
    )
    return normalizePaginated(data)
  }

  async buscarGrupoMassas(token: string, grupoId: string): Promise<GrupoMassasPizza> {
    const data = await fetchBffJson<{ data: GrupoMassasPizza }>(
      `${BASE}/grupo-massas/${encodeURIComponent(grupoId)}`,
      token
    )
    return unwrapData(data)
  }

  async criarGrupoMassas(
    token: string,
    input: CreateGrupoMassasPizzaInput
  ): Promise<GrupoMassasPizza> {
    const data = await fetchBffJson<{ data: GrupoMassasPizza }>(`${BASE}/grupo-massas`, token, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return unwrapData(data)
  }

  async atualizarGrupoMassas(
    token: string,
    grupoId: string,
    input: UpdateGrupoMassasPizzaInput
  ): Promise<GrupoMassasPizza> {
    const data = await fetchBffJson<{ data: GrupoMassasPizza }>(
      `${BASE}/grupo-massas/${encodeURIComponent(grupoId)}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    )
    return unwrapData(data)
  }

  async listarGruposBordas(
    token: string,
    params: PizzaPaginationParams & { categoriaPizzaId?: string } = {}
  ): Promise<PizzaPaginatedResponse<GrupoBordasPizzaSummary>> {
    const searchParams = new URLSearchParams()
    appendPagination(searchParams, params)

    const data = await fetchBffJson<Partial<PizzaPaginatedResponse<GrupoBordasPizzaSummary>>>(
      `${BASE}/grupo-bordas?${searchParams}`,
      token
    )
    return normalizePaginated(data)
  }

  async buscarGrupoBordas(token: string, grupoId: string): Promise<GrupoBordasPizza> {
    const data = await fetchBffJson<{ data: GrupoBordasPizza }>(
      `${BASE}/grupo-bordas/${encodeURIComponent(grupoId)}`,
      token
    )
    return unwrapData(data)
  }

  async criarGrupoBordas(
    token: string,
    input: CreateGrupoBordasPizzaInput
  ): Promise<GrupoBordasPizza> {
    const data = await fetchBffJson<{ data: GrupoBordasPizza }>(`${BASE}/grupo-bordas`, token, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return unwrapData(data)
  }

  async atualizarGrupoBordas(
    token: string,
    grupoId: string,
    input: UpdateGrupoBordasPizzaInput
  ): Promise<GrupoBordasPizza> {
    const data = await fetchBffJson<{ data: GrupoBordasPizza }>(
      `${BASE}/grupo-bordas/${encodeURIComponent(grupoId)}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    )
    return unwrapData(data)
  }

  async listarComplementos(token: string, categoriaPizzaId: string): Promise<ComplementoPizza[]> {
    const searchParams = new URLSearchParams({ categoriaPizzaId })
    const data = await fetchBffJson<{ data: ComplementoPizza[] }>(
      `${BASE}/complementos?${searchParams}`,
      token
    )
    return unwrapData(data)
  }

  async criarComplemento(
    token: string,
    input: CreateComplementoPizzaInput
  ): Promise<ComplementoPizza> {
    const data = await fetchBffJson<{ data: ComplementoPizza }>(`${BASE}/complementos`, token, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return unwrapData(data)
  }

  async substituirPrecosComplemento(
    token: string,
    complementoId: string,
    input: ReplaceComplementoPizzaPrecosInput
  ): Promise<ComplementoPizza> {
    const data = await fetchBffJson<{ data: ComplementoPizza }>(
      `${BASE}/complementos/${encodeURIComponent(complementoId)}/precos`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      }
    )
    return unwrapData(data)
  }

  async desvincularComplemento(token: string, complementoId: string): Promise<void> {
    await fetchBffDelete(`${BASE}/complementos/${encodeURIComponent(complementoId)}`, token)
  }

  async reordenarCategoriaVoid(
    token: string,
    categoriaId: string,
    novaPosicao: number
  ): Promise<void> {
    await fetchBffVoid(
      `${BASE}/categorias/${encodeURIComponent(categoriaId)}/reordena-categoria`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({ novaPosicao }),
      }
    )
  }

  async reordenarSaborVoid(token: string, saborId: string, novaPosicao: number): Promise<void> {
    await fetchBffVoid(`${BASE}/sabores/${encodeURIComponent(saborId)}/reordena-sabor`, token, {
      method: 'PATCH',
      body: JSON.stringify({ novaPosicao }),
    })
  }
}

export const pizzaBffRepository = new PizzaBffRepository()
