import { IGrupoComplementoRepository } from '@/src/domain/repositories/IGrupoComplementoRepository'

/**
 * Caso de uso para deletar grupo de complementos
 */
export class DeletarGrupoComplementoUseCase {
  constructor(private repository: IGrupoComplementoRepository) {}

  async execute(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID do grupo de complementos é obrigatório')
    }

    return this.repository.deletarGrupoComplemento(id)
  }
}

