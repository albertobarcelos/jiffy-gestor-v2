import type { ITaxaRepository } from '@/src/domain/repositories/ITaxaRepository'

export class ExcluirTaxaUseCase {
  constructor(private repository: ITaxaRepository) {}

  async execute(id: string): Promise<void> {
    await this.repository.excluirTaxa(id)
  }
}
