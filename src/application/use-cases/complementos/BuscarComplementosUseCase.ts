import { IComplementoRepository, BuscarComplementosParams } from '@/src/domain/repositories/IComplementoRepository'
import { Complemento } from '@/src/domain/entities/Complemento'

/**
 * Caso de uso para buscar complementos
 */
export class BuscarComplementosUseCase {
  constructor(private repository: IComplementoRepository) {}

  async execute(params: BuscarComplementosParams): Promise<{
    complementos: Complemento[]
    total: number
  }> {
    return this.repository.buscarComplementos(params)
  }
}

