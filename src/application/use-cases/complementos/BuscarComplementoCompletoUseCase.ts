import type { ComplementoCompleto } from '@/src/domain/complemento/tipos'
import type { IComplementoOverrideRepository } from '@/src/domain/repositories/IComplementoOverrideRepository'

export class BuscarComplementoCompletoUseCase {
  constructor(private readonly repository: IComplementoOverrideRepository) {}

  async execute(id: string): Promise<ComplementoCompleto | null> {
    const complementoId = id?.trim()
    if (!complementoId) {
      throw new Error('ID do complemento é obrigatório')
    }
    return this.repository.buscarCompleto(complementoId)
  }
}
