import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type {
  CategoriaPizza,
  GrupoBordasPizza,
  GrupoBordasPizzaSummary,
  GrupoMassasPizza,
  GrupoMassasPizzaSummary,
  PizzaTamanho,
} from '@/src/shared/types/pizza'
import {
  buildEditDraftFromLoaded,
  type PizzaCategoriaEditDraft,
} from './pizzaEditMappers'

async function parseError(response: Response, fallback: string): Promise<never> {
  const errorData = await response.json().catch(() => ({}))
  throw new ApiError(
    (errorData as { message?: string }).message || fallback,
    response.status,
    errorData
  )
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const response = await fetchGestorApi(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) await parseError(response, 'Erro ao carregar dados da pizza')
  const data = await response.json()
  return (data.data ?? data) as T
}

async function fetchPaginatedItems<T>(url: string, token: string): Promise<T[]> {
  const response = await fetchGestorApi(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) await parseError(response, 'Erro ao carregar lista')
  const data = await response.json()
  return (data.items ?? []) as T[]
}

export async function carregarPizzaCategoriaEdicao(
  token: string,
  categoriaId: string
): Promise<PizzaCategoriaEditDraft> {
  const categoria = await fetchJson<CategoriaPizza>(
    `/api/cardapio/pizza/categorias/${categoriaId}`,
    token
  )

  const tamanhos = await fetchPaginatedItems<PizzaTamanho>(
    `/api/cardapio/pizza/tamanhos?categoriaPizzaId=${categoriaId}&limit=50&offset=0`,
    token
  )

  const gruposMassasSummary = await fetchPaginatedItems<GrupoMassasPizzaSummary>(
    `/api/cardapio/pizza/grupo-massas?categoriaPizzaId=${categoriaId}&limit=10&offset=0`,
    token
  )
  const gruposBordasSummary = await fetchPaginatedItems<GrupoBordasPizzaSummary>(
    `/api/cardapio/pizza/grupo-bordas?categoriaPizzaId=${categoriaId}&limit=10&offset=0`,
    token
  )

  let grupoMassas: GrupoMassasPizza | null = null
  if (gruposMassasSummary[0]?.id) {
    grupoMassas = await fetchJson<GrupoMassasPizza>(
      `/api/cardapio/pizza/grupo-massas/${gruposMassasSummary[0].id}`,
      token
    )
  }

  let grupoBordas: GrupoBordasPizza | null = null
  if (gruposBordasSummary[0]?.id) {
    grupoBordas = await fetchJson<GrupoBordasPizza>(
      `/api/cardapio/pizza/grupo-bordas/${gruposBordasSummary[0].id}`,
      token
    )
  }

  return buildEditDraftFromLoaded({ categoria, tamanhos, grupoMassas, grupoBordas })
}
