import { IMeioPagamentoRepository, BuscarMeiosPagamentosParams, CriarMeioPagamentoDTO, AtualizarMeioPagamentoDTO } from '@/src/domain/repositories/IMeioPagamentoRepository'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Implementação do repositório de meios de pagamento
 * Comunica com a API externa
 */
export class MeioPagamentoRepository implements IMeioPagamentoRepository {
  private apiClient: ApiClient
  private token?: string

  constructor(apiClient?: ApiClient, token?: string) {
    this.apiClient = apiClient || new ApiClient()
    this.token = token
  }

  setToken(token: string) {
    this.token = token
  }

  async buscarMeiosPagamentos(params: BuscarMeiosPagamentosParams): Promise<{
    meiosPagamento: MeioPagamento[]
    total: number
  }> {
    try {
      const { limit, offset, q = '', ativo } = params

      let url = `/api/v1/preferencias/meios-pagamento?limit=${limit}&offset=${offset}`
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

      const meiosPagamento = (response.data.items || []).map((item) =>
        MeioPagamento.fromJSON(item)
      )

      return {
        meiosPagamento,
        total: response.data.count || 0,
      }
    } catch (error) {
      console.error('MeioPagamentoRepository.buscarMeiosPagamentos error:', error)
      if (error instanceof ApiError) {
        console.error('ApiError details:', {
          message: error.message,
          status: error.status,
          data: error.data
        })
        throw new Error(`Erro ao buscar meios de pagamento: ${error.message}`)
      }
      throw error
    }
  }

  async buscarMeioPagamentoPorId(id: string): Promise<MeioPagamento | null> {
    try {
      const response = await this.apiClient.request<any>(
        `/api/v1/preferencias/meios-pagamento/${id}`,
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

      return MeioPagamento.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          return null
        }
        throw new Error(`Erro ao buscar meio de pagamento: ${error.message}`)
      }
      throw error
    }
  }

  async criarMeioPagamento(data: CriarMeioPagamentoDTO): Promise<MeioPagamento> {
    try {
      const body = {
        nome: data.nome,
        tefAtivo: data.tefAtivo !== undefined ? data.tefAtivo : true,
        formaPagamentoFiscal: data.formaPagamentoFiscal || 'Dinheiro',
        ativo: data.ativo !== undefined ? data.ativo : true,
      }

      const response = await this.apiClient.request<any>(
        `/api/v1/preferencias/meios-pagamento`,
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

      return MeioPagamento.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao criar meio de pagamento: ${error.message}`)
      }
      throw error
    }
  }

  async atualizarMeioPagamento(id: string, data: AtualizarMeioPagamentoDTO): Promise<MeioPagamento> {
    try {
      const requestBody: any = {}

      if (data.nome) requestBody.nome = data.nome
      if (data.tefAtivo !== undefined) requestBody.tefAtivo = data.tefAtivo
      if (data.formaPagamentoFiscal !== undefined) requestBody.formaPagamentoFiscal = data.formaPagamentoFiscal
      if (data.ativo !== undefined) requestBody.ativo = data.ativo

      const response = await this.apiClient.request<any>(
        `/api/v1/preferencias/meios-pagamento/${id}`,
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

      return MeioPagamento.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao atualizar meio de pagamento: ${error.message}`)
      }
      throw error
    }
  }

  async deletarMeioPagamento(id: string): Promise<void> {
    try {
      await this.apiClient.request(
        `/api/v1/preferencias/meios-pagamento/${id}`,
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
        throw new Error(`Erro ao deletar meio de pagamento: ${error.message}`)
      }
      throw error
    }
  }
}

