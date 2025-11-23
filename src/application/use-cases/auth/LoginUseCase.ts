import { IAuthRepository } from '@/src/domain/repositories/IAuthRepository'
import { LoginDTO, LoginSchema } from '@/src/application/dto/LoginDTO'
import { Auth } from '@/src/domain/entities/Auth'

/**
 * Caso de uso: Realizar login
 * Orquestra a lógica de autenticação
 */
export class LoginUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  /**
   * Executa o login do usuário
   * @param dto - Dados de login (username e password)
   * @returns Promise com Auth contendo token e dados do usuário
   * @throws Error se as credenciais forem inválidas ou dados inválidos
   */
  async execute(dto: LoginDTO): Promise<Auth> {
    // Validação dos dados de entrada
    const validatedData = LoginSchema.parse(dto)

    // Remove espaços do username (email)
    const cleanUsername = validatedData.username.trim()

    // Delega para o repositório
    return this.authRepository.login(cleanUsername, validatedData.password)
  }
}

