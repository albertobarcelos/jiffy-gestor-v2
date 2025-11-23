import { IGrupoComplementoRepository, BuscarGruposComplementosParams, CriarGrupoComplementoDTO, AtualizarGrupoComplementoDTO } from '@/src/domain/repositories/IGrupoComplementoRepository'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Implementação do repositório de grupos de complementos
 * Comunica com a API externa
 */
export class GrupoComplementoRepository implements IGrupoComplementoRepository {
  private apiClient: ApiClient
  private token?: string

  constructor(apiClient?: ApiClient, token?: string) {
    this.apiClient = apiClient || new ApiClient()
    this.token = token
  }

  setToken(token: string) {
    this.token = token
  }

  async buscarGruposComplementos(params: BuscarGruposComplementosParams): Promise<{
    grupos: GrupoComplemento[]
    total: number
  }> {
    try {
      const { limit, offset, q = '', ativo } = params

      let url = `/api/v1/cardapio/grupos-complementos?limit=${limit}&offset=${offset}`
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

      const grupos = (response.data.items || []).map((item) =>
        GrupoComplemento.fromJSON(item)
      )

      return {
        grupos,
        total: response.data.count || 0,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao buscar grupos de complementos: ${error.message}`)
      }
      throw error
    }
  }

  async buscarGrupoComplementoPorId(id: string): Promise<GrupoComplemento | null> {
    try {
      const response = await this.apiClient.request<any>(
        `/api/v1/cardapio/grupos-complementos/${id}`,
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

      return GrupoComplemento.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.statusCode === 404) {
          return null
        }
        throw new Error(`Erro ao buscar grupo de complementos: ${error.message}`)
      }
      throw error
    }
  }

  async criarGrupoComplemento(data: CriarGrupoComplementoDTO): Promise<GrupoComplemento> {
    try {
      const body = {
        nome: data.nome,
        qtdMinima: data.qtdMinima,
        qtdMaxima: data.qtdMaxima,
        ativo: data.ativo !== undefined ? data.ativo : true,
        complementosIds: data.complementosIds || [],
      }

      const response = await this.apiClient.request<any>(
        `/api/v1/cardapio/grupos-complementos`,
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

      return GrupoComplemento.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao criar grupo de complementos: ${error.message}`)
      }
      throw error
    }
  }

  async atualizarGrupoComplemento(id: string, data: AtualizarGrupoComplementoDTO): Promise<GrupoComplemento> {
    try {
      const requestBody: any = {}

      if (data.nome) requestBody.nome = data.nome
      if (data.qtdMinima !== undefined) requestBody.qtdMinima = data.qtdMinima
      if (data.qtdMaxima !== undefined) requestBody.qtdMaxima = data.qtdMaxima
      if (data.ativo !== undefined) requestBody.ativo = data.ativo
      if (data.complementosIds !== undefined) requestBody.complementosIds = data.complementosIds

      const response = await this.apiClient.request<any>(
        `/api/v1/cardapio/grupos-complementos/${id}`,
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

      return GrupoComplemento.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao atualizar grupo de complementos: ${error.message}`)
      }
      throw error
    }
  }

  async deletarGrupoComplemento(id: string): Promise<void> {
    try {
      await this.apiClient.request(
        `/api/v1/cardapio/grupos-complementos/${id}`,
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
        throw new Error(`Erro ao deletar grupo de complementos: ${error.message}`)
      }
      throw error
    }
  }
}

