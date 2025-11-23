import { IComplementoRepository, CriarComplementoDTO } from '@/src/domain/repositories/IComplementoRepository'
import { Complemento } from '@/src/domain/entities/Complemento'
import { CriarComplementoSchema } from '@/src/application/dto/CriarComplementoDTO'

/**
 * Caso de uso para criar complemento
 */
export class CriarComplementoUseCase {
  constructor(private repository: IComplementoRepository) {}

  async execute(data: CriarComplementoDTO): Promise<Complemento> {
    // Validação com Zod
    const validatedData = CriarComplementoSchema.parse(data)

    return this.repository.criarComplemento(validatedData)
  }
}

