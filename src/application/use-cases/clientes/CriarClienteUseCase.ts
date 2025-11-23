import { IClienteRepository, CriarClienteDTO } from '@/src/domain/repositories/IClienteRepository'
import { Cliente } from '@/src/domain/entities/Cliente'
import { CriarClienteSchema } from '@/src/application/dto/CriarClienteDTO'

/**
 * Caso de uso para criar cliente
 */
export class CriarClienteUseCase {
  constructor(private repository: IClienteRepository) {}

  async execute(data: CriarClienteDTO): Promise<Cliente> {
    // Validação com Zod
    const validatedData = CriarClienteSchema.parse(data)

    return this.repository.criarCliente(validatedData)
  }
}

