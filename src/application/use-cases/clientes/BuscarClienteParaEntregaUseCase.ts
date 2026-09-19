import { Cliente } from '@/src/domain/entities/Cliente'
import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'

export class BuscarClienteParaEntregaUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository) {}

  async execute(clienteId: string, token: string): Promise<Cliente | null> {
    const id = clienteId?.trim()
    if (!id) return null
    const data = await this.repo.buscarClienteJson(id, token)
    if (!data) return null
    return Cliente.fromJSON(data)
  }
}
