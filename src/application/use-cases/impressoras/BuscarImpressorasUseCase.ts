import { IImpressoraRepository, BuscarImpressorasParams } from '@/src/domain/repositories/IImpressoraRepository'
import { Impressora } from '@/src/domain/entities/Impressora'

/**
 * Caso de uso para buscar impressoras
 */
export class BuscarImpressorasUseCase {
  constructor(private repository: IImpressoraRepository) {}

  async execute(params: BuscarImpressorasParams): Promise<{
    impressoras: Impressora[]
    total: number
  }> {
    return this.repository.buscarImpressoras(params)
  }
}

