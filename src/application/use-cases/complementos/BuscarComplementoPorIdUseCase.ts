import { IComplementoRepository } from '@/src/domain/repositories/IComplementoRepository'
import { Complemento } from '@/src/domain/entities/Complemento'

/**
 * Caso de uso para buscar complemento por ID
 */
export class BuscarComplementoPorIdUseCase {
  constructor(private repository: IComplementoRepository) {}

  async execute(id: string): Promise<Complemento | null> {
    if (!id) {
      throw new Error('ID do complemento é obrigatório')
    }

    return this.repository.buscarComplementoPorId(id)
  }
}

