import { IUsuarioRepository, AtualizarUsuarioDTO } from '@/src/domain/repositories/IUsuarioRepository'
import { Usuario } from '@/src/domain/entities/Usuario'
import { AtualizarUsuarioSchema } from '@/src/application/dto/AtualizarUsuarioDTO'

/**
 * Caso de uso para atualizar usuário
 */
export class AtualizarUsuarioUseCase {
  constructor(private repository: IUsuarioRepository) {}

  async execute(id: string, data: AtualizarUsuarioDTO): Promise<Usuario> {
    if (!id) {
      throw new Error('ID do usuário é obrigatório')
    }

    // Validação com Zod (partial - todos os campos são opcionais)
    const validatedData = AtualizarUsuarioSchema.parse(data)

    return this.repository.atualizarUsuario(id, validatedData)
  }
}

