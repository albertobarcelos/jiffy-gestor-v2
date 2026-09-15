import type { IClienteEntregaRepository } from '@/src/domain/repositories/IClienteEntregaRepository'
import { clienteEntregaRepository } from '@/src/infrastructure/api/repositories/ClienteEntregaRepository'

export class AtualizarNomeClienteEntregaUseCase {
  constructor(private readonly repo: IClienteEntregaRepository = clienteEntregaRepository) {}

  execute(clienteId: string, nome: string, token: string): Promise<void> {
    const id = clienteId.trim()
    const nomeTrim = nome.trim()
    if (!id) throw new Error('Cliente inválido.')
    if (!nomeTrim) throw new Error('Informe o nome do cliente.')
    return this.repo.atualizarNome(id, nomeTrim, token)
  }
}

export const atualizarNomeClienteEntregaUseCase = new AtualizarNomeClienteEntregaUseCase()
