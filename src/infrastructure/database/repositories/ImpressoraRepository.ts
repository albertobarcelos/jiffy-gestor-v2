import { IImpressoraRepository, BuscarImpressorasParams, CriarImpressoraDTO, AtualizarImpressoraDTO } from '@/src/domain/repositories/IImpressoraRepository'
import { Impressora } from '@/src/domain/entities/Impressora'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { warnImpressao } from '@/src/shared/utils/logImpressaoDelivery'

function extrairListaImpressoras(payload: unknown): { items: any[]; count: number } {
  if (Array.isArray(payload)) {
    return { items: payload, count: payload.length }
  }

  if (!payload || typeof payload !== 'object') {
    return { items: [], count: 0 }
  }

  const o = payload as Record<string, unknown>
  const candidates = [o.items, o.data, o.results, o.impressoras]
  const items = candidates.find(Array.isArray) as any[] | undefined
  const countRaw = o.count ?? o.total ?? o.totalItems ?? o.totalCount
  const count = Number(countRaw)

  return {
    items: items ?? [],
    count: Number.isFinite(count) ? count : items?.length ?? 0,
  }
}

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

      const response = await this.apiClient.request<unknown>(url, {
        method: 'GET',
        headers: this.token
          ? {
              Authorization: `Bearer ${this.token}`,
            }
          : {},
      })

      const normalizado = extrairListaImpressoras(response.data)

      const impressoras = normalizado.items
        .map((item) => {
          try {
            return Impressora.fromJSON(item)
          } catch (error) {
            warnImpressao('repo.impressoras.item_invalido', {
              motivo: error instanceof Error ? error.message : String(error),
              chaves: item && typeof item === 'object' ? Object.keys(item) : [],
            })
            return null
          }
        })
        .filter((item): item is Impressora => item !== null)

      return {
        impressoras,
        total: normalizado.count,
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

