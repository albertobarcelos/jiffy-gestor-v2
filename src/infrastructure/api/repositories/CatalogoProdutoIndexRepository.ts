import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import {
  montarCatalogoProdutoIndex,
  type CatalogoProdutoIndexItem,
  slimCatalogoProdutoIndexItem,
} from '@/src/shared/utils/catalogoProdutoIndex'
import type { CatalogoProdutoListaIndex } from '@/src/shared/utils/menuProdutoPermissoes'

const PAGE_SIZE = 100

/**
 * Monta o índice slim (código + flags) paginando o backend no servidor.
 * Sem `include=impressoras,fiscal` — payload menor que `/api/produtos`.
 */
export class CatalogoProdutoIndexRepository {
  constructor(private readonly apiClient = new ApiClient()) {}

  private async fetchPage(
    token: string,
    offset: number
  ): Promise<{ items: CatalogoProdutoIndexItem[]; count: number }> {
    const url = `/api/v1/cardapio/produtos/?q=&limit=${PAGE_SIZE}&offset=${offset}`
    const response = await this.apiClient.request<{
      items?: unknown[]
      count?: number
    }>(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const rawItems = Array.isArray(response.data.items) ? response.data.items : []
    const items: CatalogoProdutoIndexItem[] = []
    for (const raw of rawItems) {
      const slim = slimCatalogoProdutoIndexItem(raw)
      if (slim) items.push(slim)
    }
    return {
      items,
      count: response.data.count ?? items.length,
    }
  }

  async carregarIndex(token: string): Promise<CatalogoProdutoListaIndex> {
    try {
      const first = await this.fetchPage(token, 0)
      const all = [...first.items]

      if (first.items.length >= PAGE_SIZE && first.count > PAGE_SIZE) {
        const offsets: number[] = []
        for (let offset = PAGE_SIZE; offset < first.count; offset += PAGE_SIZE) {
          offsets.push(offset)
        }
        const pages = await Promise.all(offsets.map(offset => this.fetchPage(token, offset)))
        for (const page of pages) {
          all.push(...page.items)
        }
      } else if (first.items.length >= PAGE_SIZE) {
        // count ausente/inconsistente: continua em série até página curta
        let offset = first.items.length
        for (;;) {
          const page = await this.fetchPage(token, offset)
          all.push(...page.items)
          if (page.items.length < PAGE_SIZE) break
          offset += page.items.length
        }
      }

      return montarCatalogoProdutoIndex(all)
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError(
        error instanceof Error ? error.message : 'Erro ao carregar índice de produtos',
        500
      )
    }
  }
}
