import { IPerfilUsuarioRepository } from '@/src/domain/repositories/IPerfilUsuarioRepository'
import { PerfilUsuario } from '@/src/domain/entities/PerfilUsuario'

/**
 * Caso de uso para buscar perfil de usuário por ID
 */
export class BuscarPerfilUsuarioPorIdUseCase {
  constructor(private repository: IPerfilUsuarioRepository) {}

  async execute(id: string): Promise<PerfilUsuario | null> {
    if (!id) {
      throw new Error('ID do perfil de usuário é obrigatório')
    }

    return this.repository.buscarPerfilUsuarioPorId(id)
  }
}

