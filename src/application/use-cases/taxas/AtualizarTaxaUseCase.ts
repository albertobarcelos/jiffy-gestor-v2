import type { AtualizarTaxaRequest } from '@/src/application/dto/AtualizarTaxaDTO'
import type { ITaxaRepository } from '@/src/domain/repositories/ITaxaRepository'
import type { Taxa } from '@/src/domain/entities/Taxa'

export class AtualizarTaxaUseCase {
  constructor(private repository: ITaxaRepository) {}

  async execute(id: string, data: AtualizarTaxaRequest): Promise<Taxa> {
    return this.repository.atualizarTaxa(id, data)
  }
}
