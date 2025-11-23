import { IImpressoraRepository, CriarImpressoraDTO } from '@/src/domain/repositories/IImpressoraRepository'
import { Impressora } from '@/src/domain/entities/Impressora'
import { CriarImpressoraSchema } from '@/src/application/dto/CriarImpressoraDTO'

/**
 * Caso de uso para criar impressora
 */
export class CriarImpressoraUseCase {
  constructor(private repository: IImpressoraRepository) {}

  async execute(data: CriarImpressoraDTO): Promise<Impressora> {
    // Validação com Zod
    const validatedData = CriarImpressoraSchema.parse(data)

    return this.repository.criarImpressora(validatedData)
  }
}

