import { IUsuarioRepository, BuscarUsuariosParams } from '@/src/domain/repositories/IUsuarioRepository'
import { Usuario } from '@/src/domain/entities/Usuario'

/**
 * Caso de uso para buscar usuários
 */
export class BuscarUsuariosUseCase {
  constructor(private repository: IUsuarioRepository) {}

  async execute(params: BuscarUsuariosParams): Promise<{
    usuarios: Usuario[]
    total: number
  }> {
    return this.repository.buscarUsuarios(params)
  }
}

