import type { IMesasAbertasReadRepository } from '@/src/domain/repositories/IMesasAbertasReadRepository'
import type { UsuarioPdvResumo } from '@/src/domain/types/mesasAbertas'

export class ListarUsuariosPdvMesasUseCase {
  constructor(private readonly repo: IMesasAbertasReadRepository) {}

  execute(token: string): Promise<UsuarioPdvResumo[]> {
    return this.repo.listarTodosUsuariosPdv(token)
  }
}
