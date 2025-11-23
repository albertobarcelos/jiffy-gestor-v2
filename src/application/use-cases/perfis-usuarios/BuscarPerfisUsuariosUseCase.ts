import { IPerfilUsuarioRepository, BuscarPerfisUsuariosParams } from '@/src/domain/repositories/IPerfilUsuarioRepository'
import { PerfilUsuario } from '@/src/domain/entities/PerfilUsuario'

/**
 * Caso de uso para buscar perfis de usuários
 */
export class BuscarPerfisUsuariosUseCase {
  constructor(private repository: IPerfilUsuarioRepository) {}

  async execute(params: BuscarPerfisUsuariosParams): Promise<{
    perfis: PerfilUsuario[]
    total: number
  }> {
    return this.repository.buscarPerfisUsuarios(params)
  }
}

