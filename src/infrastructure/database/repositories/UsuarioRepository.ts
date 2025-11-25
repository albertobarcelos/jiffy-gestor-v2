import { IUsuarioRepository, BuscarUsuariosParams, CriarUsuarioDTO, AtualizarUsuarioDTO } from '@/src/domain/repositories/IUsuarioRepository'
import { Usuario } from '@/src/domain/entities/Usuario'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Implementação do repositório de usuários
 * Comunica com a API externa
 */
export class UsuarioRepository implements IUsuarioRepository {
  private apiClient: ApiClient
  private token?: string

  constructor(apiClient?: ApiClient, token?: string) {
    this.apiClient = apiClient || new ApiClient()
    this.token = token
  }

  setToken(token: string) {
    this.token = token
  }

  async buscarUsuarios(params: BuscarUsuariosParams): Promise<{
    usuarios: Usuario[]
    total: number
  }> {
    try {
      const { limit, offset, q = '', perfilPdvId, name, ativo } = params

      let url = `/api/v1/pessoas/usuarios-pdv?limit=${limit}&offset=${offset}`
      if (q) {
        url += `&q=${encodeURIComponent(q)}`
      }
      if (perfilPdvId) {
        url += `&perfilPdvId=${encodeURIComponent(perfilPdvId)}`
      }
      if (name) {
        url += `&name=${encodeURIComponent(name)}`
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

      const usuarios = (response.data.items || []).map((item) =>
        Usuario.fromJSON(item)
      )

      return {
        usuarios,
        total: response.data.count || 0,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao buscar usuários: ${error.message}`)
      }
      throw error
    }
  }

  async buscarUsuarioPorId(id: string): Promise<Usuario | null> {
    try {
      const response = await this.apiClient.request<any>(
        `/api/v1/pessoas/usuarios-pdv/${id}`,
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

      return Usuario.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          return null
        }
        throw new Error(`Erro ao buscar usuário: ${error.message}`)
      }
      throw error
    }
  }

  async criarUsuario(data: CriarUsuarioDTO): Promise<Usuario> {
    try {
      const body: any = {
        id: data.id,
        nome: data.nome,
        telefone: data.telefone || '',
        ativo: data.ativo !== undefined ? data.ativo : true,
        password: data.password || '',
        perfilPdvId: data.perfilPdvId || '',
      }

      const response = await this.apiClient.request<any>(
        `/api/v1/pessoas/usuarios-pdv`,
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

      return Usuario.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao criar usuário: ${error.message}`)
      }
      throw error
    }
  }

  async atualizarUsuario(id: string, data: AtualizarUsuarioDTO): Promise<Usuario> {
    try {
      const requestBody: any = {}

      if (data.nome) requestBody.nome = data.nome
      if (data.telefone !== undefined) requestBody.telefone = data.telefone
      if (data.ativo !== undefined) requestBody.ativo = data.ativo
      if (data.password) requestBody.password = data.password
      if (data.perfilPdvId) requestBody.perfilPdvId = data.perfilPdvId

      const response = await this.apiClient.request<any>(
        `/api/v1/pessoas/usuarios-pdv/${id}`,
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

      return Usuario.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao atualizar usuário: ${error.message}`)
      }
      throw error
    }
  }

  async deletarUsuario(id: string): Promise<void> {
    try {
      await this.apiClient.request(
        `/api/v1/pessoas/usuarios-pdv/${id}`,
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
        throw new Error(`Erro ao deletar usuário: ${error.message}`)
      }
      throw error
    }
  }
}

