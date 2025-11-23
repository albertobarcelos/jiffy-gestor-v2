import { IClienteRepository } from '@/src/domain/repositories/IClienteRepository'
import { Cliente } from '@/src/domain/entities/Cliente'

/**
 * Caso de uso para buscar cliente por ID
 */
export class BuscarClientePorIdUseCase {
  constructor(private repository: IClienteRepository) {}

  async execute(id: string): Promise<Cliente | null> {
    if (!id) {
      throw new Error('ID do cliente é obrigatório')
    }

    return this.repository.buscarClientePorId(id)
  }
}

