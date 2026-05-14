import { Auth } from '../entities/Auth'
import type { LoginEmpresaSnapshot } from '../types/LoginEmpresaSnapshot'

/** Resultado do login: sessão + opcional lista de empresas (fluxo hub gestor). */
export interface LoginResult {
  auth: Auth
  empresas?: LoginEmpresaSnapshot[]
}

/**
 * Interface do repositório de autenticação
 * Seguindo o princípio de Dependency Inversion
 */
export interface IAuthRepository {
  /**
   * Realiza login com username e password
   * @param username - Email ou username do usuário
   * @param password - Senha do usuário
   * @returns Promise com Auth e, quando aplicável, empresas retornadas pela API
   * @throws Error se as credenciais forem inválidas
   */
  login(username: string, password: string): Promise<LoginResult>
}

