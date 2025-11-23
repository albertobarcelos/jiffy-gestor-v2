import { IProdutoRepository } from '@/src/domain/repositories/IProdutoRepository'
import { Produto } from '@/src/domain/entities/Produto'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Implementação do repositório de produtos
 * Comunica com a API externa
 */
export class ProdutoRepository implements IProdutoRepository {
  private apiClient: ApiClient
  private token?: string

  constructor(apiClient?: ApiClient, token?: string) {
    this.apiClient = apiClient || new ApiClient()
    this.token = token
  }

  setToken(token: string) {
    this.token = token
  }

  async buscarProdutos(params: {
    name?: string
    limit: number
    offset: number
    ativo?: boolean | null
  }): Promise<{ produtos: Produto[]; total: number }> {
    try {
      const { name = '', limit, offset, ativo } = params

      // Constrói a URL exatamente como no Flutter
      let url = `/api/v1/cardapio/produtos/?q=${encodeURIComponent(name)}&limit=${limit}&offset=${offset}`
      if (ativo !== null && ativo !== undefined) {
        url += `&ativo=${ativo}`
      }

      const response = await this.apiClient.request<{
        items: any[]
        count: number
      }>(url, {
        method: 'GET',
        headers: this.token
          ? {
              Authorization: `Bearer ${this.token}`,
            }
          : {},
      })

      const produtos = (response.data.items || []).map((item) =>
        Produto.fromJSON(item)
      )

      return {
        produtos,
        total: response.data.count || 0,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message || 'Erro ao buscar produtos')
      }
      throw error
    }
  }

  async buscarProdutoPorId(id: string): Promise<Produto | null> {
    try {
      const response = await this.apiClient.request<any>(
        `/api/v1/cardapio/produtos/${id}`,
        {
          method: 'GET',
          headers: this.token
            ? {
                Authorization: `Bearer ${this.token}`,
              }
            : {},
        }
      )

      return Produto.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null
      }
      throw error
    }
  }

  async atualizarStatus(id: string, ativo: boolean): Promise<Produto> {
    try {
      const response = await this.apiClient.request<any>(
        `/api/v1/cardapio/produtos/${id}`,
        {
          method: 'PUT',
          headers: this.token
            ? {
                Authorization: `Bearer ${this.token}`,
                'Content-Type': 'application/json',
              }
            : {
                'Content-Type': 'application/json',
              },
          body: JSON.stringify({ ativo }),
        }
      )

      return Produto.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message || 'Erro ao atualizar status do produto')
      }
      throw error
    }
  }
}

