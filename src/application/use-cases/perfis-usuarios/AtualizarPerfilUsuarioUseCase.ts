import { IPerfilUsuarioRepository, AtualizarPerfilUsuarioDTO } from '@/src/domain/repositories/IPerfilUsuarioRepository'
import { PerfilUsuario } from '@/src/domain/entities/PerfilUsuario'
import { AtualizarPerfilUsuarioSchema } from '@/src/application/dto/AtualizarPerfilUsuarioDTO'

/**
 * Caso de uso para atualizar perfil de usuário
 */
export class AtualizarPerfilUsuarioUseCase {
  constructor(private repository: IPerfilUsuarioRepository) {}

  async execute(id: string, data: AtualizarPerfilUsuarioDTO): Promise<PerfilUsuario> {
    if (!id) {
      throw new Error('ID do perfil de usuário é obrigatório')
    }

    // Validação com Zod (partial - todos os campos são opcionais)
    const validatedData = AtualizarPerfilUsuarioSchema.parse(data)

    return this.repository.atualizarPerfilUsuario(id, validatedData)
  }
}

