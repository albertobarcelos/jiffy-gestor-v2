import { IClienteRepository, AtualizarClienteDTO } from '@/src/domain/repositories/IClienteRepository'
import { Cliente } from '@/src/domain/entities/Cliente'
import { AtualizarClienteSchema } from '@/src/application/dto/AtualizarClienteDTO'

/**
 * Caso de uso para atualizar cliente
 */
export class AtualizarClienteUseCase {
  constructor(private repository: IClienteRepository) {}

  async execute(id: string, data: AtualizarClienteDTO): Promise<Cliente> {
    if (!id) {
      throw new Error('ID do cliente é obrigatório')
    }

    // Validação com Zod (partial - todos os campos são opcionais)
    const validatedData = AtualizarClienteSchema.parse(data)

    return this.repository.atualizarCliente(id, validatedData)
  }
}

