import { Produto } from '@/src/domain/entities/Produto'
import { PRODUTOS_LOTE_PAGE_SIZE, FILTRO_NCM_SEM_CADASTRO } from '../constants'
import type { ProdutosLoteFilterState } from '../types'
import { filtroColunaVaziaParaSemDadoEm } from '../rules/produtosLoteFiltros'

/** Normaliza a resposta da listagem de produtos (items/produtos/array) em entidades. */
export function parseProdutosLoteApiResponse(data: unknown): {
  list: Produto[]
  count: number | null
} {
  const d = data as Record<string, unknown>
  const produtosList = Array.isArray(d.items)
    ? d.items
    : Array.isArray(d.produtos)
      ? d.produtos
      : Array.isArray(data)
        ? (data as unknown[])
        : []

  const list = produtosList
    .map((p: unknown) => {
      try {
        return Produto.fromJSON(p as Record<string, unknown>)
      } catch (error) {
        console.error('Erro ao parsear produto:', error, p)
        return null
      }
    })
    .filter((p: Produto | null): p is Produto => p !== null)

  const count = typeof d.count === 'number' ? d.count : null
  return { list, count }
}

/** Monta query string da listagem de produtos em lote. */
export function buildProdutosLoteParams(
  filters: ProdutosLoteFilterState,
  offset: number
): URLSearchParams {
  const ativoFilter =
    filters.filterStatus === 'Ativo' ? true : filters.filterStatus === 'Desativado' ? false : null
  const ativoLocalBoolean =
    filters.ativoLocalFilter === 'Sim' ? true : filters.ativoLocalFilter === 'Não' ? false : null
  const ativoDeliveryBoolean =
    filters.ativoDeliveryFilter === 'Sim'
      ? true
      : filters.ativoDeliveryFilter === 'Não'
        ? false
        : null

  const params = new URLSearchParams({
    name: filters.searchText,
    limit: PRODUTOS_LOTE_PAGE_SIZE.toString(),
    offset: offset.toString(),
  })
  if (ativoFilter !== null) {
    params.append('ativo', ativoFilter.toString())
  }
  if (ativoLocalBoolean !== null) {
    params.append('ativoLocal', ativoLocalBoolean.toString())
  }
  if (ativoDeliveryBoolean !== null) {
    params.append('ativoDelivery', ativoDeliveryBoolean.toString())
  }
  if (filters.grupoProdutoFilter) {
    params.append('grupoProdutoId', filters.grupoProdutoFilter)
  }
  if (filters.filtroNcm === FILTRO_NCM_SEM_CADASTRO) {
    params.append('semDadoEm', 'sem_ncm')
  } else if (filters.filtroNcm.trim()) {
    params.append('ncm', filters.filtroNcm.trim())
  }
  const semDadoEm = filtroColunaVaziaParaSemDadoEm(filters.filtroColunaVazia)
  if (semDadoEm) {
    params.append('semDadoEm', semDadoEm)
  }
  return params
}

/** Busca uma página da listagem de produtos em lote. */
export async function fetchProdutosLotePage(
  filters: ProdutosLoteFilterState,
  offset: number,
  token: string,
  signal?: AbortSignal
): Promise<{ list: Produto[]; count: number | null }> {
  const params = buildProdutosLoteParams(filters, offset)
  const response = await fetch(`/api/produtos?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Erro ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  return parseProdutosLoteApiResponse(data)
}
