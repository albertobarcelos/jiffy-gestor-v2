import { IPerfilUsuarioRepository, BuscarPerfisUsuariosParams, CriarPerfilUsuarioDTO, AtualizarPerfilUsuarioDTO } from '@/src/domain/repositories/IPerfilUsuarioRepository'
import { PerfilUsuario } from '@/src/domain/entities/PerfilUsuario'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Implementação do repositório de perfis de usuários
 * Comunica com a API externa
 */
export class PerfilUsuarioRepository implements IPerfilUsuarioRepository {
  private apiClient: ApiClient
  private token?: string

  constructor(apiClient?: ApiClient, token?: string) {
    this.apiClient = apiClient || new ApiClient()
    this.token = token
  }

  setToken(token: string) {
    this.token = token
  }

  async buscarPerfisUsuarios(params: BuscarPerfisUsuariosParams): Promise<{
    perfis: PerfilUsuario[]
    total: number
  }> {
    try {
      const { limit, offset, q = '', ativo } = params

      let url = `/api/v1/pessoas/perfis-pdv?limit=${limit}&offset=${offset}`
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

      const perfis = (response.data.items || []).map((item) =>
        PerfilUsuario.fromJSON(item)
      )

      return {
        perfis,
        total: response.data.count || 0,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao buscar perfis de usuários: ${error.message}`)
      }
      throw error
    }
  }

  async buscarPerfilUsuarioPorId(id: string): Promise<PerfilUsuario | null> {
    try {
      const response = await this.apiClient.request<any>(
        `/api/v1/pessoas/perfis-pdv/${id}`,
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

      return PerfilUsuario.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          return null
        }
        throw new Error(`Erro ao buscar perfil de usuário: ${error.message}`)
      }
      throw error
    }
  }

  async criarPerfilUsuario(data: CriarPerfilUsuarioDTO): Promise<PerfilUsuario> {
    try {
      const body = {
        role: data.role,
        acessoMeiosPagamento: data.acessoMeiosPagamento || [],
        cancelarVenda: data.cancelarVenda !== undefined ? data.cancelarVenda : false,
        cancelarProduto: data.cancelarProduto !== undefined ? data.cancelarProduto : false,
        aplicarDescontoProduto: data.aplicarDescontoProduto !== undefined ? data.aplicarDescontoProduto : false,
        aplicarDescontoVenda: data.aplicarDescontoVenda !== undefined ? data.aplicarDescontoVenda : false,
        aplicarAcrescimoProduto: data.aplicarAcrescimoProduto !== undefined ? data.aplicarAcrescimoProduto : false,
        aplicarAcrescimoVenda: data.aplicarAcrescimoVenda !== undefined ? data.aplicarAcrescimoVenda : false,
      }

      const response = await this.apiClient.request<any>(
        `/api/v1/pessoas/perfis-pdv`,
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

      return PerfilUsuario.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao criar perfil de usuário: ${error.message}`)
      }
      throw error
    }
  }

  async atualizarPerfilUsuario(id: string, data: AtualizarPerfilUsuarioDTO): Promise<PerfilUsuario> {
    try {
      const requestBody: any = {}

      if (data.role) requestBody.role = data.role
      if (data.acessoMeiosPagamento !== undefined) requestBody.acessoMeiosPagamento = data.acessoMeiosPagamento
      if (data.cancelarVenda !== undefined) requestBody.cancelarVenda = data.cancelarVenda
      if (data.cancelarProduto !== undefined) requestBody.cancelarProduto = data.cancelarProduto
      if (data.aplicarDescontoProduto !== undefined) requestBody.aplicarDescontoProduto = data.aplicarDescontoProduto
      if (data.aplicarDescontoVenda !== undefined) requestBody.aplicarDescontoVenda = data.aplicarDescontoVenda
      if (data.aplicarAcrescimoProduto !== undefined) requestBody.aplicarAcrescimoProduto = data.aplicarAcrescimoProduto
      if (data.aplicarAcrescimoVenda !== undefined) requestBody.aplicarAcrescimoVenda = data.aplicarAcrescimoVenda

      const response = await this.apiClient.request<any>(
        `/api/v1/pessoas/perfis-pdv/${id}`,
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

      return PerfilUsuario.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao atualizar perfil de usuário: ${error.message}`)
      }
      throw error
    }
  }

  async deletarPerfilUsuario(id: string): Promise<void> {
    try {
      await this.apiClient.request(
        `/api/v1/pessoas/perfis-pdv/${id}`,
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
        throw new Error(`Erro ao deletar perfil de usuário: ${error.message}`)
      }
      throw error
    }
  }
}

