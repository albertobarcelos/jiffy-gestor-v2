import type { BuscarTaxaPorIdResult } from '@/src/domain/repositories/ITaxaRepository'
import type { ITaxaRepository } from '@/src/domain/repositories/ITaxaRepository'

export class BuscarTaxaPorIdUseCase {
  constructor(private repository: ITaxaRepository) {}

  async execute(id: string): Promise<BuscarTaxaPorIdResult> {
    return this.repository.buscarTaxaPorId(id)
  }
}
