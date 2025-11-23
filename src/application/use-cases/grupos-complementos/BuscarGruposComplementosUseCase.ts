import { IGrupoComplementoRepository, BuscarGruposComplementosParams } from '@/src/domain/repositories/IGrupoComplementoRepository'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'

/**
 * Caso de uso para buscar grupos de complementos
 */
export class BuscarGruposComplementosUseCase {
  constructor(private repository: IGrupoComplementoRepository) {}

  async execute(params: BuscarGruposComplementosParams): Promise<{
    grupos: GrupoComplemento[]
    total: number
  }> {
    return this.repository.buscarGruposComplementos(params)
  }
}

