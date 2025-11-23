import { IImpressoraRepository } from '@/src/domain/repositories/IImpressoraRepository'
import { Impressora } from '@/src/domain/entities/Impressora'

/**
 * Caso de uso para buscar impressora por ID
 */
export class BuscarImpressoraPorIdUseCase {
  constructor(private repository: IImpressoraRepository) {}

  async execute(id: string): Promise<Impressora | null> {
    if (!id) {
      throw new Error('ID da impressora é obrigatório')
    }

    return this.repository.buscarImpressoraPorId(id)
  }
}

