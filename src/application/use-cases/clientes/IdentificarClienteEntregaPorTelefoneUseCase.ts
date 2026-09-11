import type { Cliente } from '@/src/domain/entities/Cliente'
import type { IClienteEntregaRepository } from '@/src/domain/repositories/IClienteEntregaRepository'
import { clienteEntregaRepository } from '@/src/infrastructure/api/repositories/ClienteEntregaRepository'

export class IdentificarClienteEntregaPorTelefoneUseCase {
  constructor(private readonly repo: IClienteEntregaRepository = clienteEntregaRepository) {}

  execute(telefone: string, token: string): Promise<Cliente | null> {
    return this.repo.buscarPorTelefone(telefone, token)
  }
}

export const identificarClienteEntregaPorTelefoneUseCase =
  new IdentificarClienteEntregaPorTelefoneUseCase()
