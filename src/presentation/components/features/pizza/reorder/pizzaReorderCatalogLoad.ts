import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { CategoriaPizza, SaborPizzaSummary } from '@/src/shared/types/pizza'

const PAGE_SIZE = 50

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
    if (page.items.length < PAGE_SIZE) break
  }

  return items
}

function sortByOrdemThenNome<T extends { ordem: number; nome: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const oa = Number(a.ordem)
    const ob = Number(b.ordem)
    if (Number.isFinite(oa) && Number.isFinite(ob) && oa !== ob) return oa - ob
    return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  })
}

export async function fetchAllPizzaCategorias(token: string): Promise<CategoriaPizza[]> {
  const items = await fetchAllPages<CategoriaPizza>({
    fetchPage: async offset => {
      const searchParams = new URLSearchParams()
      searchParams.set('limit', String(PAGE_SIZE))
      searchParams.set('offset', String(offset))

      const response = await fetchGestorApi(
        `/api/cardapio/pizza/categorias?${searchParams}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
      )
      if (!response.ok) {
        throw new Error('Erro ao carregar categorias pizza')
      }
      const data = await response.json()
      return {
        items: (data.items ?? []) as CategoriaPizza[],
        count: data.count ?? 0,
      }
    },
  })

  return sortByOrdemThenNome(items)
}

export async function fetchAllPizzaSabores(
  token: string,
  categoriaPizzaId?: string
): Promise<SaborPizzaSummary[]> {
  const items = await fetchAllPages<SaborPizzaSummary>({
    fetchPage: async offset => {
      const searchParams = new URLSearchParams()
      if (categoriaPizzaId) searchParams.set('categoriaPizzaId', categoriaPizzaId)
      searchParams.set('limit', String(PAGE_SIZE))
      searchParams.set('offset', String(offset))

      const response = await fetchGestorApi(
        `/api/cardapio/pizza/sabores?${searchParams}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
      )
      if (!response.ok) {
        throw new Error('Erro ao carregar sabores')
      }
      const data = await response.json()
      return {
        items: (data.items ?? []) as SaborPizzaSummary[],
        count: data.count ?? 0,
      }
    },
  })

  return sortByOrdemThenNome(items)
}

export async function fetchAllPizzaSaboresByCategoria(
  token: string,
  categoriaPizzaId: string
): Promise<SaborPizzaSummary[]> {
  return fetchAllPizzaSabores(token, categoriaPizzaId)
}

export function groupSaboresByCategoriaId(
  sabores: SaborPizzaSummary[]
): Record<string, SaborPizzaSummary[]> {
  const map: Record<string, SaborPizzaSummary[]> = {}
  for (const sabor of sabores) {
    const list = map[sabor.categoriaPizzaId] ?? []
    list.push(sabor)
    map[sabor.categoriaPizzaId] = list
  }
  for (const categoriaId of Object.keys(map)) {
    map[categoriaId] = sortByOrdemThenNome(map[categoriaId]!)
  }
  return map
}

export async function fetchTamanhosCountByCategorias(
  token: string,
  categoriaIds: readonly string[]
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    categoriaIds.map(async categoriaId => {
      const searchParams = new URLSearchParams()
      searchParams.set('categoriaPizzaId', categoriaId)
      searchParams.set('limit', '1')
      searchParams.set('offset', '0')

      const response = await fetchGestorApi(
        `/api/cardapio/pizza/tamanhos?${searchParams}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
      )
      if (!response.ok) {
        throw new Error('Erro ao carregar tamanhos da categoria')
      }
      const data = await response.json()
      return [categoriaId, data.count ?? 0] as const
    })
  )

  return Object.fromEntries(entries)
}

export function categoriaPizzaLabel(categoria: CategoriaPizza): string {
  return categoria.nome?.trim() || 'Categoria'
}

export function saborPizzaLabel(sabor: SaborPizzaSummary): string {
  return sabor.nome?.trim() || 'Sabor'
}
