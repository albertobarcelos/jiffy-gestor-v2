import { IAuthRepository } from '@/src/domain/repositories/IAuthRepository'
import { Auth } from '@/src/domain/entities/Auth'
import { User } from '@/src/domain/entities/User'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Implementação do repositório de autenticação
 * Comunica com a API externa
 */
export class AuthRepository implements IAuthRepository {
  private apiClient: ApiClient

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || new ApiClient()
  }

  async login(username: string, password: string): Promise<Auth> {
    try {
      // Rota exata do Flutter: /api/v1/auth/login/usuario-gestor
      const response = await this.apiClient.post<{
        accessToken: string
        user?: {
          id: string
          email: string
          name?: string
        }
      }>('/api/v1/auth/login/usuario-gestor', {
        username,
        password,
      })

      const { accessToken, user } = response.data

      if (!accessToken) {
        throw new Error('Token de acesso não recebido')
      }

      // Cria usuário a partir dos dados recebidos ou usa dados mínimos
      const userEntity = user
        ? User.create(user.id, user.email, user.name)
        : User.create('unknown', username)

      // Cria Auth com token válido por 24 horas
      return Auth.create(accessToken, userEntity, 24)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message || 'Erro ao realizar login')
      }
      throw error
    }
  }
}

