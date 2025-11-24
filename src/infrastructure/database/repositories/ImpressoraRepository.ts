import { IImpressoraRepository, BuscarImpressorasParams, CriarImpressoraDTO, AtualizarImpressoraDTO } from '@/src/domain/repositories/IImpressoraRepository'
import { Impressora } from '@/src/domain/entities/Impressora'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Implementação do repositório de impressoras
 * Comunica com a API externa
 */
export class ImpressoraRepository implements IImpressoraRepository {
  private apiClient: ApiClient
  private token?: string

  constructor(apiClient?: ApiClient, token?: string) {
    this.apiClient = apiClient || new ApiClient()
    this.token = token
  }

  setToken(token: string) {
    this.token = token
  }

  async buscarImpressoras(params: BuscarImpressorasParams): Promise<{
    impressoras: Impressora[]
    total: number
  }> {
    try {
      const { limit, offset, q = '' } = params

      let url = `/api/v1/preferencias/impressoras?limit=${limit}&offset=${offset}`
      if (q) {
        url += `&q=${encodeURIComponent(q)}`
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

      const impressoras = (response.data.items || []).map((item) =>
        Impressora.fromJSON(item)
      )

      return {
        impressoras,
        total: response.data.count || 0,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao buscar impressoras: ${error.message}`)
      }
      throw error
    }
  }

  async buscarImpressoraPorId(id: string): Promise<Impressora | null> {
    try {
      const response = await this.apiClient.request<any>(
        `/api/v1/preferencias/impressoras/${id}`,
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

      return Impressora.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          return null
        }
        throw new Error(`Erro ao buscar impressora: ${error.message}`)
      }
      throw error
    }
  }

  async criarImpressora(data: CriarImpressoraDTO): Promise<Impressora> {
    try {
      const body: any = {
        nome: data.nome,
        modelo: data.modelo || '',
        ativo: data.ativo !== undefined ? data.ativo : true,
        tipoConexao: data.tipoConexao || '',
        ip: data.ip || '',
        porta: data.porta || '',
      }

      if (data.terminais) {
        body.terminais = data.terminais
      }

      const response = await this.apiClient.request<any>(
        `/api/v1/preferencias/impressoras`,
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

      return Impressora.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao criar impressora: ${error.message}`)
      }
      throw error
    }
  }

  async atualizarImpressora(id: string, data: AtualizarImpressoraDTO): Promise<Impressora> {
    try {
      const requestBody: any = {}

      if (data.nome) requestBody.nome = data.nome
      if (data.modelo !== undefined) requestBody.modelo = data.modelo
      if (data.ativo !== undefined) requestBody.ativo = data.ativo
      if (data.tipoConexao !== undefined) requestBody.tipoConexao = data.tipoConexao
      if (data.ip !== undefined) requestBody.ip = data.ip
      if (data.porta !== undefined) requestBody.porta = data.porta
      if (data.terminais !== undefined) requestBody.terminais = data.terminais

      const response = await this.apiClient.request<any>(
        `/api/v1/preferencias/impressoras/${id}`,
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

      return Impressora.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao atualizar impressora: ${error.message}`)
      }
      throw error
    }
  }

  async deletarImpressora(id: string): Promise<void> {
    try {
      await this.apiClient.request(
        `/api/v1/preferencias/impressoras/${id}`,
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
        throw new Error(`Erro ao deletar impressora: ${error.message}`)
      }
      throw error
    }
  }
}

