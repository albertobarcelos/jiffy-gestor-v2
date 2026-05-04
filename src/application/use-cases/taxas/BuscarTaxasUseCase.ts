import { Taxa } from '@/src/domain/entities/Taxa'
import { ITaxaRepository, BuscarTaxasParams } from '@/src/domain/repositories/ITaxaRepository'

/**
 * Caso de uso para buscar taxas da empresa (paginação + busca textual).
 */
export class BuscarTaxasUseCase {
  constructor(private repository: ITaxaRepository) {}

  async execute(params: BuscarTaxasParams): Promise<{
    taxas: Taxa[]
    total: number
  }> {
    return this.repository.buscarTaxas(params)
  }
}
