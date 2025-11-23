import { IUsuarioRepository, CriarUsuarioDTO } from '@/src/domain/repositories/IUsuarioRepository'
import { Usuario } from '@/src/domain/entities/Usuario'
import { CriarUsuarioSchema } from '@/src/application/dto/CriarUsuarioDTO'

/**
 * Caso de uso para criar usuário
 */
export class CriarUsuarioUseCase {
  constructor(private repository: IUsuarioRepository) {}

  async execute(data: CriarUsuarioDTO): Promise<Usuario> {
    // Validação com Zod
    const validatedData = CriarUsuarioSchema.parse(data)

    return this.repository.criarUsuario(validatedData)
  }
}

