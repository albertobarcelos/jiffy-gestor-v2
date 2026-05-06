import { IAuthRepository, type LoginResult } from '@/src/domain/repositories/IAuthRepository'
import { LoginDTO, LoginSchema } from '@/src/application/dto/LoginDTO'

/**
 * Caso de uso: Realizar login
 * Orquestra a lógica de autenticação
 */
export class LoginUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  /**
   * Executa o login do usuário
   * @param dto - Dados de login (username e password)
   * @returns Promise com Auth e opcional lista de empresas (hub gestor)
   * @throws Error se as credenciais forem inválidas ou dados inválidos
   */
  async execute(dto: LoginDTO): Promise<LoginResult> {
    // Validação dos dados de entrada
    const validatedData = LoginSchema.parse(dto)

    // Remove espaços do username (email)
    const cleanUsername = validatedData.username.trim()

    // Delega para o repositório
    return this.authRepository.login(cleanUsername, validatedData.password)
  }
}

