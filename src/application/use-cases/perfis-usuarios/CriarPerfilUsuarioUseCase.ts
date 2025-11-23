import { IPerfilUsuarioRepository, CriarPerfilUsuarioDTO } from '@/src/domain/repositories/IPerfilUsuarioRepository'
import { PerfilUsuario } from '@/src/domain/entities/PerfilUsuario'
import { CriarPerfilUsuarioSchema } from '@/src/application/dto/CriarPerfilUsuarioDTO'

/**
 * Caso de uso para criar perfil de usuário
 */
export class CriarPerfilUsuarioUseCase {
  constructor(private repository: IPerfilUsuarioRepository) {}

  async execute(data: CriarPerfilUsuarioDTO): Promise<PerfilUsuario> {
    // Validação com Zod
    const validatedData = CriarPerfilUsuarioSchema.parse(data)

    return this.repository.criarPerfilUsuario(validatedData)
  }
}

