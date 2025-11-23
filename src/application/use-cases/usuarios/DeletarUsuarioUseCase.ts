import { IUsuarioRepository } from '@/src/domain/repositories/IUsuarioRepository'

/**
 * Caso de uso para deletar usuário
 */
export class DeletarUsuarioUseCase {
  constructor(private repository: IUsuarioRepository) {}

  async execute(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID do usuário é obrigatório')
    }

    return this.repository.deletarUsuario(id)
  }
}

