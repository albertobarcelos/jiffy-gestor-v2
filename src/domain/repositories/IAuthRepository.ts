import { Auth } from '../entities/Auth'

/**
 * Interface do repositório de autenticação
 * Seguindo o princípio de Dependency Inversion
 */
export interface IAuthRepository {
  /**
   * Realiza login com username e password
   * @param username - Email ou username do usuário
   * @param password - Senha do usuário
   * @returns Promise com Auth contendo token e dados do usuário
   * @throws Error se as credenciais forem inválidas
   */
  login(username: string, password: string): Promise<Auth>
}

