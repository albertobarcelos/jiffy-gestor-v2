import { IUsuarioRepository } from '@/src/domain/repositories/IUsuarioRepository'
import { Usuario } from '@/src/domain/entities/Usuario'

/**
 * Caso de uso para buscar usuário por ID
 */
export class BuscarUsuarioPorIdUseCase {
  constructor(private repository: IUsuarioRepository) {}

  async execute(id: string): Promise<Usuario | null> {
    if (!id) {
      throw new Error('ID do usuário é obrigatório')
    }

    return this.repository.buscarUsuarioPorId(id)
  }
}

