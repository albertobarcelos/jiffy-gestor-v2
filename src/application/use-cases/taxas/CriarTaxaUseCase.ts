import type { CriarTaxaRequest } from '@/src/application/dto/CriarTaxaDTO'
import type { ITaxaRepository } from '@/src/domain/repositories/ITaxaRepository'
import type { Taxa } from '@/src/domain/entities/Taxa'

/**
 * Registra nova taxa da empresa no backend.
 */
export class CriarTaxaUseCase {
  constructor(private repository: ITaxaRepository) {}

  async execute(data: CriarTaxaRequest): Promise<Taxa> {
    return this.repository.criarTaxa(data)
  }
}
