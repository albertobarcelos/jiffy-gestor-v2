import { IClienteRepository, BuscarClientesParams } from '@/src/domain/repositories/IClienteRepository'
import { Cliente } from '@/src/domain/entities/Cliente'

/**
 * Caso de uso para buscar clientes
 */
export class BuscarClientesUseCase {
  constructor(private repository: IClienteRepository) {}

  async execute(params: BuscarClientesParams): Promise<{
    clientes: Cliente[]
    total: number
  }> {
    return this.repository.buscarClientes(params)
  }
}

