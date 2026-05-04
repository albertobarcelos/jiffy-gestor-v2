import { IComplementoRepository, BuscarComplementosParams, CriarComplementoDTO, AtualizarComplementoDTO } from '@/src/domain/repositories/IComplementoRepository'
import { Complemento } from '@/src/domain/entities/Complemento'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Implementação do repositório de complementos
 * Comunica com a API externa
 */
export class ComplementoRepository implements IComplementoRepository {
  private apiClient: ApiClient
  private token?: string

  constructor(apiClient?: ApiClient, token?: string) {
    this.apiClient = apiClient || new ApiClient()
    this.token = token
  }

  setToken(token: string) {
    this.token = token
  }

  async buscarComplementos(params: BuscarComplementosParams): Promise<{
    complementos: Complemento[]
    total: number
  }> {
    try {
      const { limit, offset, q = '', ativo } = params
      /** A API upstream só aceita limit <= 100; acima disso agregamos páginas. */
      const UPSTREAM_MAX = 100
      const safeLimit = Math.max(0, Number.isFinite(limit) ? limit : 0)
      const safeOffset = Math.max(0, Number.isFinite(offset) ? offset : 0)

      const fetchPage = async (chunkLimit: number, chunkOffset: number) => {
        const capped = Math.min(chunkLimit, UPSTREAM_MAX)
        let url = `/api/v1/cardapio/complementos-produto?limit=${capped}&offset=${chunkOffset}`
        if (q) {
          url += `&q=${encodeURIComponent(q)}`
        }
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

        const complementos = (response.data.items || []).map((item) =>
          Complemento.fromJSON(item)
        )
        return {
          complementos,
          count: response.data.count || 0,
        }
      }

      if (safeLimit === 0) {
        return { complementos: [], total: 0 }
      }

      // Uma requisição: janela cabe no máximo permitido pela API externa
      if (safeLimit <= UPSTREAM_MAX) {
        const { complementos, count } = await fetchPage(safeLimit, safeOffset)
        return { complementos, total: count }
      }

      // Várias requisições de até 100 itens, depois recorta o intervalo [offset, offset+limit)
      const collected: Complemento[] = []
      let totalCount = 0
      const endIndex = safeOffset + safeLimit
      let apiOffset = 0

      while (collected.length < safeLimit && apiOffset < endIndex) {
        const { complementos: items, count } = await fetchPage(UPSTREAM_MAX, apiOffset)
        if (totalCount === 0) {
          totalCount = count
        }

        const globalStart = apiOffset
        const startInPage = Math.max(0, safeOffset - globalStart)
        const endInPage = Math.min(items.length, endIndex - globalStart)

        for (let i = startInPage; i < endInPage; i++) {
          collected.push(items[i])
        }

        if (items.length < UPSTREAM_MAX) {
          break
        }
        apiOffset += items.length
      }

      return {
        complementos: collected,
        total: totalCount,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao buscar complementos: ${error.message}`)
      }
      throw error
    }
  }

  async buscarComplementoPorId(id: string): Promise<Complemento | null> {
    try {
      const response = await this.apiClient.request<any>(
        `/api/v1/cardapio/complementos-produto/${id}`,
        {
          method: 'GET',
          headers: this.token
            ? {
                Authorization: `Bearer ${this.token}`,
              }
            : {},
        }
      )

      if (!response.data) {
        return null
      }

      return Complemento.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          return null
        }
        throw new Error(`Erro ao buscar complemento: ${error.message}`)
      }
      throw error
    }
  }

  async criarComplemento(data: CriarComplementoDTO): Promise<Complemento> {
    try {
      const body = {
        nome: data.nome,
        descricao: data.descricao || '',
        valor: data.valor || 0,
        ativo: data.ativo !== undefined ? data.ativo : true,
        tipoImpactoPreco: data.tipoImpactoPreco || '',
      }

      const response = await this.apiClient.request<any>(
        `/api/v1/cardapio/complementos-produto`,
        {
          method: 'POST',
          headers: this.token
            ? {
                Authorization: `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                accept: 'application/json',
              }
            : {
                'Content-Type': 'application/json',
                accept: 'application/json',
              },
          body: JSON.stringify(body),
        }
      )

      return Complemento.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao criar complemento: ${error.message}`)
      }
      throw error
    }
  }

  async atualizarComplemento(id: string, data: AtualizarComplementoDTO): Promise<Complemento> {
    try {
      const requestBody: any = {}

      if (data.nome) requestBody.nome = data.nome
      if (data.descricao) requestBody.descricao = data.descricao
      if (data.valor !== undefined) requestBody.valor = data.valor
      if (data.ativo !== undefined) requestBody.ativo = data.ativo
      if (data.tipoImpactoPreco) requestBody.tipoImpactoPreco = data.tipoImpactoPreco
      if (data.ordem !== undefined) requestBody.ordem = data.ordem

      const response = await this.apiClient.request<any>(
        `/api/v1/cardapio/complementos-produto/${id}`,
        {
          method: 'PATCH',
          headers: this.token
            ? {
                Authorization: `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                accept: 'application/json',
              }
            : {
                'Content-Type': 'application/json',
                accept: 'application/json',
              },
          body: JSON.stringify(requestBody),
        }
      )

      return Complemento.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao atualizar complemento: ${error.message}`)
      }
      throw error
    }
  }

  async deletarComplemento(id: string): Promise<void> {
    try {
      await this.apiClient.request(
        `/api/v1/cardapio/complementos-produto/${id}`,
        {
          method: 'DELETE',
          headers: this.token
            ? {
                Authorization: `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                accept: 'application/json',
              }
            : {
                'Content-Type': 'application/json',
                accept: 'application/json',
              },
        }
      )
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao deletar complemento: ${error.message}`)
      }
      throw error
    }
  }
}

