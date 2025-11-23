import { IPerfilUsuarioRepository } from '@/src/domain/repositories/IPerfilUsuarioRepository'

/**
 * Caso de uso para deletar perfil de usuário
 */
export class DeletarPerfilUsuarioUseCase {
  constructor(private repository: IPerfilUsuarioRepository) {}

  async execute(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID do perfil de usuário é obrigatório')
    }

    return this.repository.deletarPerfilUsuario(id)
  }
}

