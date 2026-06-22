import { Cliente } from '@/src/domain/entities/Cliente'
import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export class BuscarClienteParaEntregaUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  async execute(clienteId: string, token: string): Promise<Cliente | null> {
    const id = clienteId?.trim()
    if (!id) return null
    const data = await this.repo.buscarClienteJson(id, token)
    if (!data) return null
    return Cliente.fromJSON(data)
  }
}

export const buscarClienteParaEntregaUseCase = new BuscarClienteParaEntregaUseCase()
