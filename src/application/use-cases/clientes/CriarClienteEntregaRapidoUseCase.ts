import type { Cliente } from '@/src/domain/entities/Cliente'
import type { IClienteEntregaRepository } from '@/src/domain/repositories/IClienteEntregaRepository'
import { clienteEntregaRepository } from '@/src/infrastructure/api/repositories/ClienteEntregaRepository'

export class CriarClienteEntregaRapidoUseCase {
  constructor(private readonly repo: IClienteEntregaRepository = clienteEntregaRepository) {}

  execute(input: { nome: string; telefone: string }, token: string): Promise<Cliente> {
    return this.repo.criarRapido(input, token)
  }
}

export const criarClienteEntregaRapidoUseCase = new CriarClienteEntregaRapidoUseCase()
