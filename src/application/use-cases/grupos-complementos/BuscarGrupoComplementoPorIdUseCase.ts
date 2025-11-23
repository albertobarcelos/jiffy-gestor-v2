import { IGrupoComplementoRepository } from '@/src/domain/repositories/IGrupoComplementoRepository'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'

/**
 * Caso de uso para buscar grupo de complementos por ID
 */
export class BuscarGrupoComplementoPorIdUseCase {
  constructor(private repository: IGrupoComplementoRepository) {}

  async execute(id: string): Promise<GrupoComplemento | null> {
    if (!id) {
      throw new Error('ID do grupo de complementos é obrigatório')
    }

    return this.repository.buscarGrupoComplementoPorId(id)
  }
}

